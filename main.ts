/// <reference lib="dom" />
import { FooterComponent } from "../../Components/FootComponent.ts";
export * from "../../Components/FootComponent.ts"
export * from "../../Components/TableComponent.ts"


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
document.title = "Liabilities"

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

const footer = document.getElementById("footer-component") as FooterComponent
footer.init(thisSchema, appContext)
