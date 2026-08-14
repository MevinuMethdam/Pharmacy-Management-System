const NmraLog = require('../models/NmraLog');

exports.getNmraLogs = async (req, res) => {
    try {
        const logs = await NmraLog.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(logs);
    } catch (err) {
        console.error("Error fetching NMRA logs:", err);
        res.status(500).json({ error: 'Failed to fetch NMRA logs' });
    }
};