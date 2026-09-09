const cron = require('node-cron');
const { Op } = require('sequelize');
const nodemailer = require('nodemailer');
const PurchaseInvoice = require('../models/PurchaseInvoice');
const Supplier = require('../models/Supplier');
const Notification = require('../models/Notification');
const express = require('express');

module.exports = (app) => {
    cron.schedule('0 8 * * *', async () => {
        try {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + 5);
            const targetDateString = targetDate.toISOString().split('T')[0];

            const dueInvoices = await PurchaseInvoice.findAll({
                where: {
                    dueDate: { [Op.lte]: targetDateString },
                    paymentStatus: { [Op.ne]: 'Paid' },
                    reminderSent: false
                },
                include: [{ model: Supplier, as: 'supplier' }]
            });

            if (dueInvoices.length > 0) {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });

                const io = app.get('io');

                for (let invoice of dueInvoices) {
                    const dueAmount = Number(invoice.totalAmount) - Number(invoice.paidAmount || 0);

                    const newNotification = await Notification.create({
                        title: 'Upcoming Payment Reminder ⏳',
                        message: `Payment of LKR ${dueAmount.toLocaleString(undefined, {minimumFractionDigits: 2})} is due for ${invoice.supplier?.companyName || 'Supplier'} (Invoice: ${invoice.invoiceNumber}).`,
                        isRead: false
                    });

                    if (io) {
                        io.emit('receive_notification', newNotification);
                    }

                    const mailOptions = {
                        from: process.env.EMAIL_USER,
                        to: 'kegallepharmacy@gmail.com',
                        subject: `Payment Reminder: LKR ${dueAmount.toLocaleString()} due for ${invoice.supplier?.companyName}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-w: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                                <h2 style="color: #e11d48;">Payment Reminder (Kegalle Ph4Life)</h2>
                                <p>Dear Admin,</p>
                                <p>This is an automated reminder. You have a payment due within the next <strong>5 days</strong> (or overdue).</p>
                                <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                                    <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Supplier:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${invoice.supplier?.companyName}</td></tr>
                                    <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Invoice No:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${invoice.invoiceNumber}</td></tr>
                                    <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Due Date:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd; color: #e11d48;"><b>${invoice.dueDate}</b></td></tr>
                                    <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><b>Amount Due:</b></td><td style="padding: 8px; border-bottom: 1px solid #ddd; font-size: 16px;"><b>LKR ${dueAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</b></td></tr>
                                </table>
                                <p style="margin-top: 20px; color: #64748b; font-size: 12px;">Please process this payment to avoid service interruptions.</p>
                            </div>
                        `
                    };

                    await transporter.sendMail(mailOptions).catch(err => console.error("Email error:", err));

                    await invoice.update({ reminderSent: true });
                }
                console.log(`[Cron Job] Executed: ${dueInvoices.length} Payment Reminder(s) Sent!`);
            }
        } catch (error) {
            console.error("Error running due date cron job:", error);
        }
    });
};