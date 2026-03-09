import cron from "node-cron";
import Order from "../models/orderSchema.js";

export const initCleanupJob = () => {
  // Runs every day at midnight (00:00)
  cron.schedule("0 0 * * *", async () => {
    try {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

      const result = await Order.deleteMany({
        paymentMethod: "ONLINE",
        paymentStatus: "PENDING",
        createdAt: { $lte: threeDaysAgo }
      });

      console.log(`[Cron] Cleanup complete: Deleted ${result.deletedCount} old unpaid orders.`);
    } catch (err) {
      console.error("Cron Job Error:", err);
    }
  });
};