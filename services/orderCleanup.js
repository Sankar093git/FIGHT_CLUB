const cron=require("node-cron");
const Order = require('../models/orderSchema');

const initCleanupJob = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const result = await Order.deleteMany({
        paymentMethod:"ONLINE",
        paymentStatus: "PENDING",
        createdAt: { $lte: threeDaysAgo }
      });
      console.log(`[Cron] Deleted ${result.deletedCount} old unpaid orders.`);
    } catch (err) {
      console.error("Cron Error:", err);
    }
  });
};

module.exports = {
    initCleanupJob
}
