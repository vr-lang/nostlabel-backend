import app from "../app.js";
import swaggerSpec from "../docs/swagger.js";

console.log("================ NOSTLABLE BOOT VERIFIER ================");
try {
  console.log("[1/3] Checking Express application...");
  if (app && typeof app === "function") {
    console.log("   ✓ Express app instantiated successfully.");
  } else {
    throw new Error("Express app instance is invalid.");
  }

  console.log("[2/3] Checking Swagger API definition...");
  if (swaggerSpec && swaggerSpec.info) {
    console.log(`   ✓ Swagger definition loaded: "${swaggerSpec.info.title}" v${swaggerSpec.info.version}`);
  } else {
    throw new Error("Swagger specification failed to build.");
  }

  console.log("[3/3] Checking router paths...");
  const routesCount = app._router.stack.filter(r => r.route).length + 
                       app._router.stack.filter(r => r.name === "router").length;
  console.log(`   ✓ Router stack initialized. Mounted middleware/router layers: ${routesCount}`);

  console.log("\n>>> BOOT CHECK PASSED! Server is ready to start.");
  console.log("=========================================================");
  process.exit(0);
} catch (error) {
  console.error("\n>>> BOOT CHECK FAILED!");
  console.error(error.message);
  console.log("=========================================================");
  process.exit(1);
}
