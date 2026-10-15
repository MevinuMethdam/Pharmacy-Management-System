const Medicine = require('../models/Medicine');
const AIOutbreakLog = require('../models/AIOutbreakLog');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const Parser = require('rss-parser');

const newsParser = new Parser({
    customFields: {
        item: [
            ['media:thumbnail', 'mediaThumbnails', { keepArray: true }],
            ['media:content', 'mediaContents', { keepArray: true }]
        ]
    }
});

const cheerio = require('cheerio');
const { GoogleDecoder } = require('google-news-url-decoder');
const dns = require('node:dns');
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const decoder = new GoogleDecoder();

const isPublicIPv4 = (address) => {
    if (net.isIP(address) !== 4) return false;
    const [a, b, c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)))) ||
        (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
        (a === 203 && b === 0 && c === 113));
};

const publicLookup = (hostname, options, callback) => {
    dns.lookup(hostname, { family: 4, all: true }, (error, addresses) => {
        if (error) return callback(error);
        const valid = addresses.filter(item => isPublicIPv4(item.address));
        if (!valid.length) return callback(new Error('Publisher address is not public'));
        if (options && options.all) return callback(null, valid);
        callback(null, valid[0].address, 4);
    });
};
const articleHttpAgent = new http.Agent({ lookup: publicLookup });
const articleHttpsAgent = new https.Agent({ lookup: publicLookup });

const fetchArticlePage = async (input) => {
    let target = input;
    const signal = AbortSignal.timeout(15000);
    for (let hop = 0; hop < 4; hop += 1) {
        const url = new URL(target);
        const host = url.hostname.replace(/^\[\vert{}\]$/g, '');
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
            (url.port && !['80', '443'].includes(url.port)) ||
            host === 'localhost' || host.endsWith('.localhost') ||
            (net.isIP(host) && !isPublicIPv4(host))) {
            throw new Error('Unsupported publisher URL');
        }
        const response = await axios.get(url.href, {
            responseType: 'text', timeout: 10000, signal, maxRedirects: 0,
            maxContentLength: 3 * 1024 * 1024,
            httpAgent: articleHttpAgent, httpsAgent: articleHttpsAgent,
            proxy: false,
            headers: { 'User-Agent': 'PharmacyNewsPreview/1.0', Accept: 'text/html' },
            validateStatus: status => status >= 200 && status < 400
        });
        if (response.status >= 300) {
            if (!response.headers.location) throw new Error('Missing redirect target');
            target = new URL(response.headers.location, url).href;
            continue;
        }
        return { html: String(response.data), url: url.href };
    }
    throw new Error('Too many publisher redirects');
};

const withDeadline = (promise, milliseconds) => {
    let timer;
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('News URL decoding timed out')), milliseconds);
        })
    ]).finally(() => clearTimeout(timer));
};

const readPublisherImage = (html, articleUrl) => {
    const $ = cheerio.load(html);
    const candidates = [];
    for (const selector of [
        'meta[property="og:image:secure_url"]', 'meta[property="og:image"]',
        'meta[name="twitter:image"]', 'meta[property="twitter:image"]',
        'meta[name="twitter:image:src"]'
    ]) {
        $(selector).each((_, element) => candidates.push($(element).attr('content')));
    }
    $('link[rel="image_src"]').each((_, element) => candidates.push($(element).attr('href')));
    const addStructuredImages = (node) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) return node.forEach(addStructuredImages);
        const types = [].concat(node['@type'] || []);
        if (types.some(type => /Article|Report|BlogPosting/i.test(String(type)))) {
            for (const value of [].concat(node.image || [])) {
                candidates.push(typeof value === 'string' ? value : value?.url || value?.contentUrl);
            }
        }
        if (node['@graph']) addStructuredImages(node['@graph']);
    };
    $('script[type="application/ld+json"]').each((_, element) => {
        try { addStructuredImages(JSON.parse($(element).text())); } catch {}
    });
    for (const value of candidates) {
        if (typeof value !== 'string' || !value.trim()) continue;
        try {
            const candidate = getHttpUrl(new URL(value.trim(), articleUrl).href);
            if (candidate && !/favicon|(?:^|[/_-])logo(?:[/_.-]|$)/i.test(candidate)) return candidate;
        } catch { }
    }
    return '';
};

const enrichArticleImage = async (article) => {
    const feedImage = getArticleImage(article);
    if (feedImage) return { ...article, imageUrl: feedImage, imageStatus: 'feed' };
    try {
        let publisherUrl = getHttpUrl(article.link);
        if (!publisherUrl) throw new Error('Missing article URL');
        if (new URL(publisherUrl).hostname === 'news.google.com') {
            const decoded = await withDeadline(decoder.decode(publisherUrl), 15000);
            if (!decoded?.status || !getHttpUrl(decoded.decoded_url)) {
                throw new Error(decoded?.message || 'Google News URL could not be resolved');
            }
            publisherUrl = getHttpUrl(decoded.decoded_url);
        }
        if (new URL(publisherUrl).hostname === 'news.google.com') {
            throw new Error('Publisher URL was not resolved');
        }
        const page = await fetchArticlePage(publisherUrl);
        const imageUrl = readPublisherImage(page.html, page.url);
        if (!imageUrl) throw new Error('Publisher has no article image metadata');
        return { ...article, imageUrl, publisherUrl: page.url, imageStatus: 'publisher' };
    } catch (error) {
        console.warn(`[Outbreak news image] ${article.id}: ${error.message}`);
        return { ...article, imageUrl: '', imageStatus: 'unavailable' };
    }
};

const mapWithConcurrency = async (items, limit, task) => {
    const output = new Array(items.length);
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (next < items.length) {
            const index = next++;
            output[index] = await task(items[index]);
        }
    }));
    return output;
};

const parseArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; }
        catch { return []; }
    }
    return [];
};

const getTrendArticleIds = (trend, articles) => {
    const available = new Set(articles.map(article => article.id));
    const ids = parseArray(trend.sourceArticleIds).filter(id => available.has(id));
    if (ids.length) return [...new Set(ids)];
    const headline = normalizeHeadline(trend.newsSource);
    return articles.filter(article => headline && normalizeHeadline(article.title) === headline)
        .map(article => article.id);
};

const genAI = new GoogleGenerativeAI(
    process.env.AI_ANALYSIS_GEMINI_API_KEY
);

const getHttpUrl = (value) => {
    if (typeof value !== 'string') return '';

    try {
        const url = new URL(
            value.trim().replace(/&amp;/gi, '&')
        );

        return ['https:', 'http:'].includes(url.protocol)
            ? url.href
            : '';
    } catch {
        return '';
    }
};

const getArticleImage = (article) => {
    const thumbnail = getHttpUrl(article.thumbnail);
    if (thumbnail) return thumbnail;

    const enclosures = Array.isArray(article.enclosure)
        ? article.enclosure
        : [article.enclosure];

    for (const enclosure of enclosures) {
        if (!enclosure || typeof enclosure !== 'object') continue;

        const url = getHttpUrl(enclosure.link || enclosure.url);
        const type = String(enclosure.type || '').toLowerCase();

        if (
            url &&
            (
                type.startsWith('image/') ||
                /\.(png|jpe?g|webp|gif|avif)(?:[?#]|$)/i.test(url)
            )
        ) {
            return url;
        }
    }

    for (const html of [article.description, article.content]) {
        if (typeof html !== 'string') continue;

        const pattern = /<img\b[^>]*\s+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
        let match;

        while ((match = pattern.exec(html)) !== null) {
            const url = getHttpUrl(match[1]);
            if (url) return url;
        }
    }

    return '';
};

const normalizeHeadline = (value) => {
    return typeof value === 'string'
        ? value.trim().replace(/\s+/g, ' ').toLowerCase()
        : '';
};

const collectNewsImages = (trends) => {
    const seen = new Set();
    const images = [];

    for (const trend of Array.isArray(trends) ? trends : []) {
        const trendImages = Array.isArray(trend?.newsImages)
            ? trend.newsImages
            : [];

        for (const image of trendImages) {
            const imageUrl = getHttpUrl(image?.imageUrl);

            if (!imageUrl || seen.has(imageUrl)) continue;

            seen.add(imageUrl);

            images.push({
                imageUrl,
                title: typeof image.title === 'string'
                    ? image.title
                    : '',
                articleUrl: getHttpUrl(image.articleUrl),
                publishedAt: typeof image.publishedAt === 'string'
                    ? image.publishedAt
                    : ''
            });
        }
    }

    return images;
};

exports.analyzeOutbreakTrends = async (req, res) => {
    try {
        let newsData = "";
        let newsArticles = [];

        try {
            const googleNewsUrl = new URL(
                'https://news.google.com/rss/search'
            );

            googleNewsUrl.searchParams.set(
                'q',
                '(dengue OR fever OR flu OR virus OR outbreak OR disease OR infection OR "health ministry" OR hospital OR epidemic OR "health alert") "Sri Lanka" -cricket -match -sports -tournament -ipl -wicket -runs -score -stadium -series when:14d'
            );
            googleNewsUrl.searchParams.set('hl', 'en-LK');
            googleNewsUrl.searchParams.set('gl', 'LK');
            googleNewsUrl.searchParams.set('ceid', 'LK:en');

            const newsRes = await axios.get(
                googleNewsUrl.toString(),
                {
                    responseType: 'text',
                    timeout: 15000
                }
            );

            const feed = await newsParser.parseString(newsRes.data);

            const healthTerms = ['dengue', 'fever', 'flu', 'virus', 'outbreak', 'disease', 'infection', 'health', 'hospital', 'patient', 'epidemic', 'cases', 'clinic', 'medical', 'influenza', 'leptospirosis', 'chikungunya', 'covid', 'vector-borne'];
            const excludeTerms = ['cricket', 'match', 'stadium', 'tournament', 'ipl', 'wicket', 'runs', 'football', 'soccer', 'sports', 'batsman', 'bowler', 'trophy', 'series', 'world cup'];

            const rawItems = Array.isArray(feed.items) ? feed.items : [];
            const filteredItems = rawItems.filter(item => {
                const fullText = `${item.title || ''} ${item.description || ''} ${item.content || ''}`.toLowerCase();
                const isHealthRelated = healthTerms.some(term => fullText.includes(term));
                const isSportsRelated = excludeTerms.some(term => fullText.includes(term));
                return isHealthRelated && !isSportsRelated;
            });

            const articles = filteredItems.slice(0, 10).map((item, index) => {
                const thumbnails = Array.isArray(item.mediaThumbnails)
                    ? item.mediaThumbnails
                    : [];

                const thumbnail = thumbnails
                    .map(media => getHttpUrl(media?.$?.url))
                    .find(Boolean) || '';

                const enclosures = Array.isArray(item.enclosure)
                    ? [...item.enclosure]
                    : item.enclosure
                        ? [item.enclosure]
                        : [];

                const mediaContents = Array.isArray(item.mediaContents)
                    ? item.mediaContents
                    : [];

                for (const media of mediaContents) {
                    const attributes = media?.$;
                    if (!attributes) continue;

                    const type = String(
                        attributes.type || ''
                    ).toLowerCase();

                    const medium = String(
                        attributes.medium || ''
                    ).toLowerCase();

                    if (
                        medium === 'image' ||
                        type.startsWith('image/')
                    ) {
                        enclosures.push({
                            url: attributes.url,
                            type: type.startsWith('image/')
                                ? type
                                : 'image/unknown'
                        });
                    }
                }

                return {
                    id: `N${index + 1}`,
                    title: item.title || '',
                    pubDate: item.pubDate || item.isoDate || '',
                    link: item.link || '',
                    thumbnail,
                    enclosure: enclosures,
                    description: item.description || item.content || '',
                    content: item.content || ''
                };
            });

            newsArticles = articles;
            if (!articles.length) throw new Error('No recent health news articles were returned');

            newsData = articles.map(
                a => `- Article ID: ${a.id}; Headline: ${a.title} (Published: ${a.pubDate})`
            ).join('\n');

        } catch (newsErr) {
            console.error("News API Fetch Error:", newsErr);
            return res.status(502).json({ error: 'Recent health news is unavailable. Please try again.' });
        }

        const medicines = await Medicine.findAll({
            attributes: ['name', 'category', 'quantity']
        });

        const inventoryData = medicines.map(
            m => `${m.name} [${m.category}] (Stock: ${m.quantity})`
        ).join(', ');

        const model = genAI.getGenerativeModel({
            model: 'gemini-3-flash-preview'
        });

        const prompt = `
            You are an expert Health-Tech AI, Epidemiologist, and Pharmacologist working for a pharmacy in Sri Lanka.
            
            LATEST REAL-WORLD NEWS FROM SRI LANKA (Last 14 Days):
            ${newsData}

            CURRENT PHARMACY INVENTORY:
            [ ${inventoryData || 'No medicines in stock currently'} ]

            TASK:
            1. Analyze the news to identify what diseases/outbreaks are CURRENTLY spreading in Sri Lanka.
            2. Act as a Medical Database API: For each identified disease, determine the standard pharmacy medicines used for treatment/prevention.
            3. Cross-reference these required medicines with our CURRENT INVENTORY.
            4. Every identified trend MUST include sourceArticleIds containing the exact Article IDs (e.g. N1, N3) from the supplied news. Never invent IDs, news, or image URLs.
            5. News headlines are reports, not confirmed surveillance data. Do not invent case counts or geographic spread. Describe uncertainty. Stock quantities are estimates for pharmacist review.

            Return ONLY a valid JSON object without any markdown code blocks, backticks, or extra text.
            Use EXACTLY this JSON format:
            {
                "riskLevel": "Low" | "Medium" | "High" | "Critical",
                "summaryMessage": "A 2-3 sentence executive summary of the current real-world health trends in Sri Lanka based on the news.",
                "identifiedTrends": [
                    {
                        "disease": "Name of disease currently spreading",
                        "confidenceLevel": "Percentage (e.g., 85%)",
                        "affectedMedicines": "Medicines used to treat this",
                        "trendDescription": "Why this is spreading based on news",
                        "newsSource": "Quote the exact headline from the supplied news",
                        "sourceArticleIds": ["N1"]
                    }
                ],
                "stockRecommendations": [
                    {
                        "medicineType": "Medicine Name (must match inventory or suggest new)",
                        "currentStock": "Current stock amount from inventory (e.g., 50 or '0')",
                        "requiredStock": "Estimated quantity needed to face the outbreak (e.g., 200)",
                        "reason": "Why we need this quantity based on the disease spread."
                    }
                ]
            }
        `;

        const result = await model.generateContent(prompt);

        const responseText = result.response.text()
            .replace(/```json|```/g, '')
            .trim();

        const aiData = JSON.parse(responseText);

        if (!aiData || typeof aiData !== 'object' || Array.isArray(aiData) ||
            !Array.isArray(aiData.identifiedTrends) || !Array.isArray(aiData.stockRecommendations)) {
            throw new Error('AI returned an invalid analysis format');
        }
        aiData.identifiedTrends = aiData.identifiedTrends.filter(trend =>
            trend && typeof trend === 'object' && !Array.isArray(trend)
        ).map(trend => ({ ...trend, sourceArticleIds: getTrendArticleIds(trend, newsArticles) }));

        const usedIds = new Set(aiData.identifiedTrends.flatMap(trend => trend.sourceArticleIds));
        const selectedArticles = newsArticles.filter(article => usedIds.has(article.id));
        const enrichedArticles = await mapWithConcurrency(selectedArticles, 3, enrichArticleImage);
        const articleMap = new Map(enrichedArticles.map(article => [article.id, article]));
        aiData.identifiedTrends = aiData.identifiedTrends.map(trend => ({
            ...trend,
            newsImages: trend.sourceArticleIds.map(id => articleMap.get(id))
                .filter(article => article?.imageUrl)
                .map(article => ({
                    imageUrl: article.imageUrl,
                    title: article.title,
                    articleUrl: article.publisherUrl || getHttpUrl(article.link),
                    publishedAt: article.pubDate
                }))
        }));
        aiData.newsImages = collectNewsImages(aiData.identifiedTrends);
        aiData.newsImageDiagnostics = {
            articlesFound: newsArticles.length,
            articlesCited: selectedArticles.length,
            imagesFound: aiData.newsImages.length,
            unavailable: enrichedArticles.filter(article => !article.imageUrl).map(article => article.id)
        };
        console.info('[Outbreak news images]', aiData.newsImageDiagnostics);

        await AIOutbreakLog.create({
            riskLevel: aiData.riskLevel,
            summaryMessage: aiData.summaryMessage,
            identifiedTrends: aiData.identifiedTrends,
            stockRecommendations: aiData.stockRecommendations
        });

        res.status(200).json(aiData);

    } catch (error) {
        console.error("AI Outbreak Analysis Error:", error);

        res.status(500).json({
            error: 'Failed to generate Outbreak Analysis'
        });
    }
};

exports.getOutbreakHistory = async (req, res) => {
    try {
        const history = await AIOutbreakLog.findAll({
            order: [['createdAt', 'DESC']]
        });

        const historyWithImages = history.map(log => {
            const data = typeof log.toJSON === 'function'
                ? log.toJSON()
                : log;

            let trends = data.identifiedTrends;

            if (typeof trends === 'string') {
                try {
                    trends = JSON.parse(trends);
                } catch {
                    trends = [];
                }
            }

            return {
                ...data,
                identifiedTrends: parseArray(trends),
                stockRecommendations: parseArray(data.stockRecommendations),
                newsImages: collectNewsImages(trends)
            };
        });

        res.status(200).json(historyWithImages);

    } catch (error) {
        console.error("Error fetching AI Outbreak History:", error);

        res.status(500).json({
            error: 'Failed to fetch history'
        });
    }
};