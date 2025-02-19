
import { KvCache } from "./bundle.js"

const thisSchema = {
   dbKey: "BP",
   keyColumnName:"What",
   sample: {
      What: "Z",
      When: "",
      How: ["Amex", "Checking", "Debit"],
      Auto: true,
      How_Often: ["Monthly", "Quarterly", "Annual"],
      Amount: "",
      Paid: "",
      Date_Paid: "",
      Remarks: ""
   }
}

const LOCAL = false

/** 
 * Our shared app context -> dependency injected below
 */
const appContext = {
   BYPASS_PIN: LOCAL,
   DEV: LOCAL,
   LOCAL_DB: LOCAL,
   LocalDbURL: "http://localhost:9099/",
   RemoteDbURL: "https://dt-kv-rpc.deno.dev/",
   RpcURL: "SSERPC/kvRegistration",
   PIN: '',
   FocusedRowKey: "",
   dbOptions: { schema: thisSchema }
}

document.title = thisSchema.dbKey

/**
 * Initiate async data loading and data provider
 * We pass in theabove context for the service
 */
const kvCache = new KvCache(appContext) //TODO move this into `table-container.init()`
/**
 * Initialize our Custom DataTable UI
 * We pass it a KvCache instance (data provider)
 */
document.getElementById("table-container").init(kvCache) //TODO give this `appContext` and let it build kvCache

// TODO move our build process to /common/ and copy bundle as needed