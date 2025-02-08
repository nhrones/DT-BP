/// <reference lib="dom" />

import { initDOM, KvCache } from "./deps.ts"
import type { AppContext } from "./deps.ts"

const LOCAL = false
/** 
 * Shared app context -> dependency injected 
 */
const appContext: AppContext = {
   BYPASS_PIN: LOCAL,
   DEV: LOCAL,
   LOCAL_DB: LOCAL,
   LocalDbURL: "http://localhost:9099/",
   RemoteDbURL: "https://dt-kv-rpc.deno.dev/",
   RpcURL: "SSERPC/kvRegistration",
   PIN: '',
   FocusedRowKey: "",
   dbOptions: {
      schema: {
         dbKey: "BP",
         keyColumnName:"For",
         sample: {
            For: "Z",
            Account: "",
            Freq: "",
            Auto: true,
            Due: "",
            Amount: "",
            Remarks:""
         }
      }
   }
}

/**
 * Initiate async data loading and data provider
 * We pass in a context for the service
 */
const kvCache = new KvCache(appContext)

/**
 * Initialize our Custom DataTable UI
 * We pass it a KvCache instance (data provider)
 */
initDOM(kvCache)

