/// <reference lib="dom" />
import { TableComponent } from "../../Components/TableComponent.ts";
export * from "../../Components/FootComponent.ts"
export * from "../../Components/TableComponent.ts"


/** 
 * A unique schema object 
 * Note that the data-provider and the UI both use
 * this object for auto-configuration.
 * 
 * In the schema-sample, a boolean value will produce a checkbox,
 * and a string array will be auto-configured as a select element.
 * A number set to -1 will create an uneditable cell
 * A string set to "readonly" will also create an uneditable cell
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

/** get a reference to our table-component */
const table = document.getElementById("table-component") as TableComponent
table!.init(thisSchema, appContext)
