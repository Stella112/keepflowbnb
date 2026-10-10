import {liveTradingEnabled} from "../../../lib/mode";
export async function GET() {
  const live=liveTradingEnabled();
  return Response.json({ application: "keepflow", status: "ok", mode: live?"MAINNET":"DRY_RUN", paperTradingAvailable:true, executionAvailable: live });
}
