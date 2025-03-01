/// <reference lib="dom" />
import type { AppContext, DataContext, Schema } from "../../Shared/types.ts";
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
const thisSchema: Schema = {
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
const appContext: AppContext = {
   DEV: false,
   PIN: "",
   FocusedKey: "",
}

/** 
 * Our shared data context -> dependency injected below
 */
const dataContext: DataContext = {
   LOCAL_DB: true,
   LocalDbURL: "http://localhost:9099/",
   RemoteDbURL: "https://dt-kv-rpc.deno.dev/",
   RpcURL: "SSERPC/kvRegistration",
}


/** get a reference to our table-component */
const table = document.getElementById("table-component") as TableComponent
table!.init(thisSchema, appContext, dataContext)
