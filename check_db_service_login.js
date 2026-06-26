import { dbService } from "./src/database/dbService.js";

async function main() {
  try {
    console.log("Calling verifyStaffLoginWithoutTenant...");
    const result = await dbService.verifyStaffLoginWithoutTenant("9601713321", "Admin@123");
    console.log("Login successful! Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Login failed with error:", err);
  }
}

main();
