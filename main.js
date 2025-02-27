
/** 
 * A unique schema object 
 * Note that the data-provider and the UI both use
 * this object for auto-configuration.
 * 
 * In the schema-sample, a boolean value will produce a checkbox,
 * and a string array will be auto-configured as a select element.
 */
const thisSchema = {
   dbKey: "BP",
   keyColumnName:"What",
   sampleRecord: {
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

// set the title to the dbKey value
document.title = thisSchema.dbKey

/** 
 * Our shared app context -> dependency injected below
 */
const appContext = {
   DEV: false,
   LOCAL_DB: false,
   LocalDbURL: "http://localhost:9099/",
   RemoteDbURL: "https://dt-kv-rpc.deno.dev/",
   RpcURL: "SSERPC/kvRegistration",
   PIN: '',
   FocusedKey: "",
}

/**
 * Initialize our Custom DataTable UI
 * We pass in a dbSchema and an appContext
 * @returns TableComponent.KvCache
 */
const footer = document.getElementById("footer-component")
const table = footer.init(thisSchema, appContext)

const REQUIRE_PIN = true

if (REQUIRE_PIN) {
   document.getElementById("pin-component").init(table.kvCache.CTX)
}

//TODO Do a clean separation of Data-Provider and Web-Components
//TODO Separate PIN-UI from the Table-UI --> use PIN only for KV-RPC

// PIN-UI --> Cache --> Table-UI