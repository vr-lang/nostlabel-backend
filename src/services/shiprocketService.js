/**
 * Service to integrate with Shiprocket APIs.
 * This is currently scaffolded with standard request/response mocks, ready to be hooked to Shiprocket API tokens.
 */

const getShiprocketToken = async () => {
  // If actual integration was added, we would call auth endpoint and fetch JWT token.
  return "SR_MOCK_JWT_TOKEN";
};

const createShipment = async (orderData) => {
  try {
    const token = await getShiprocketToken();
    console.log(`[Shiprocket] Creating shipment for order ${orderData.orderNumber} with token ${token}`);

    // Mock response payload from Shiprocket
    return {
      success: true,
      shipment_id: Math.floor(10000000 + Math.random() * 90000000),
      order_id: Math.floor(100000000 + Math.random() * 900000000),
      status: "NEW",
      courier_name: "Delhivery",
      courier_company_id: 10,
      onboarding_completed: true,
      isMock: true,
    };
  } catch (error) {
    console.error("Shiprocket createShipment error:", error.message);
    throw new Error(`Shiprocket integration error: ${error.message}`);
  }
};

const generateAWB = async (shipmentId) => {
  try {
    const token = await getShiprocketToken();
    console.log(`[Shiprocket] Generating AWB for shipment ${shipmentId} with token ${token}`);

    // Mock response
    return {
      success: true,
      awb_number: `SR${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      courier_name: "Delhivery",
      shipment_id: shipmentId,
      isMock: true,
    };
  } catch (error) {
    console.error("Shiprocket generateAWB error:", error.message);
    throw new Error(`Shiprocket integration error: ${error.message}`);
  }
};

const trackShipment = async (awbNumber) => {
  try {
    const token = await getShiprocketToken();
    console.log(`[Shiprocket] Tracking AWB ${awbNumber} with token ${token}`);

    return {
      success: true,
      tracking_data: {
        track_status: 1,
        shipment_status: "SHIPPED",
        shipment_track: [
          {
            id: 1,
            activity: "Manifested",
            location: "Warehouse Delhi",
            date: new Date().toISOString(),
          },
          {
            id: 2,
            activity: "Picked Up",
            location: "Delhi Hub",
            date: new Date(Date.now() + 3600000).toISOString(),
          },
        ],
      },
      isMock: true,
    };
  } catch (error) {
    console.error("Shiprocket trackShipment error:", error.message);
    throw new Error(`Shiprocket integration error: ${error.message}`);
  }
};

const cancelShipment = async (awbNumber) => {
  try {
    const token = await getShiprocketToken();
    console.log(`[Shiprocket] Cancelling AWB ${awbNumber} with token ${token}`);

    return {
      success: true,
      message: `Shipment cancelled successfully for AWB ${awbNumber}`,
      isMock: true,
    };
  } catch (error) {
    console.error("Shiprocket cancelShipment error:", error.message);
    throw new Error(`Shiprocket integration error: ${error.message}`);
  }
};

export { createShipment, generateAWB, trackShipment, cancelShipment };
