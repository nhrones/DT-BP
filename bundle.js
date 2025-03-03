// deno-lint-ignore-file
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../DataProviders/KvProvider/kvClient.ts
var DEV = false;
var KvClient = class {
  static {
    __name(this, "KvClient");
  }
  nextMsgID = 0;
  querySet = [];
  transactions = /* @__PURE__ */ new Map();
  currentPage = 1;
  focusedRow = null;
  kvCache;
  CTX;
  ServiceURL;
  RegistrationURL;
  /** ctor */
  constructor(cache2, dataContext2) {
    this.CTX = dataContext2;
    this.ServiceURL = dataContext2.LOCAL_DB ? dataContext2.LocalDbURL : dataContext2.RemoteDbURL;
    this.RegistrationURL = this.ServiceURL + dataContext2.RpcURL;
    this.kvCache = cache2;
    this.transactions = /* @__PURE__ */ new Map();
  }
  /** initialize our EventSource and fetch some data */
  init(appContext2) {
    const eventSource = new EventSource(this.RegistrationURL);
    console.log("CONNECTING");
    eventSource.addEventListener("open", () => {
      this.callProcedure(this.ServiceURL, "GET", { key: ["PIN"] }).then((result) => {
        appContext2.PIN = result.value;
        this.fetchQuerySet();
      });
    });
    eventSource.addEventListener("error", (_e) => {
      switch (eventSource.readyState) {
        case EventSource.OPEN:
          console.log("CONNECTED");
          break;
        case EventSource.CONNECTING:
          console.log("CONNECTING");
          break;
        case EventSource.CLOSED:
          console.log("DISCONNECTED");
          break;
      }
    });
    eventSource.addEventListener("message", (evt) => {
      const parsed = JSON.parse(evt.data);
      const { txID, error, result } = parsed;
      if (txID === -1) {
        this.handleMutation(result);
      }
      if (!this.transactions.has(txID)) return;
      const transaction = this.transactions.get(txID);
      this.transactions.delete(txID);
      if (transaction) transaction(error, result);
    });
  }
  /**
   * handle Mutation Event
   * @param {{ rowID: any; type: any; }} result
   */
  handleMutation(result) {
    console.info(`Mutation event:`, result);
  }
  /** set Kv Pin */
  async setKvPin(rawpin) {
    const pin = this.kvCache.encryptText(rawpin);
    await this.callProcedure(this.ServiceURL, "SET", { key: ["PIN"], value: pin }).then((_result) => {
      if (DEV) console.log(`Set PIN ${rawpin} to: `, pin);
    });
  }
  addNewRecord() {
    const newRow = Object.assign({}, this.kvCache.schema.sampleRecord);
    for (const property in newRow) {
      if (typeof newRow[property] === "object") {
        newRow[property] = newRow[property][0];
      }
    }
    const keyColName = this.kvCache.schema.keyColumnName;
    this.kvCache.set(newRow[keyColName], newRow);
  }
  /** fetch a querySet */
  async fetchQuerySet() {
    const cache2 = this.kvCache;
    await this.callProcedure(
      this.ServiceURL,
      "GET",
      { key: [this.kvCache.schema.dbKey] }
    ).then((result) => {
      if (result.value) {
        cache2.restoreCache(cache2.encryptText(result.value));
      } else {
        this.addNewRecord();
        signals.fire("buildDataTableEV", this.kvCache);
      }
    });
  }
  /** get row from key */
  get(key) {
    for (let index = 0; index < this.querySet.length; index++) {
      const element = this.querySet[index];
      if (element.id === key) return element;
    }
  }
  /** The `set` method mutates - will call the `persist` method. */
  set(value) {
    try {
      this.callProcedure(
        this.ServiceURL,
        "SET",
        {
          key: [this.kvCache.schema.dbKey],
          value
        }
      ).then((result) => {
        this.querySet = result.querySet;
        return this.querySet;
      });
    } catch (e) {
      return { Error: e };
    }
  }
  /** get row from key */
  delete(key) {
    try {
      this.callProcedure(
        this.ServiceURL,
        "DELETE",
        {
          key,
          value: ""
        }
      ).then((result) => {
        console.info("Delete result: ", result);
      });
    } catch (e) {
      return { Error: e };
    }
  }
  /** 
   * Make an Asynchronous Remote Proceedure Call
   *  
   * @param {any} procedure - the name of the remote procedure to be called
   * @param {any} params - appropriately typed parameters for this procedure
   * 
   * @returns {Promise<any>} - Promise object has a transaction that is stored by ID    
   *   in a transactions Set.   
   *   When this promise resolves or rejects, the transaction is retrieves by ID    
   *   and executed by the promise. 
   */
  callProcedure(dbServiceURL, procedure, params) {
    const txID = this.nextMsgID++;
    return new Promise((resolve, reject) => {
      this.transactions.set(txID, (error, result) => {
        if (error)
          return reject(new Error(error));
        resolve(result);
      });
      fetch(dbServiceURL, {
        method: "POST",
        mode: "cors",
        body: JSON.stringify({ txID, procedure, params })
      });
    });
  }
};

// ../../DataProviders/KvProvider/kvCache.ts
var KvCache = class {
  static {
    __name(this, "KvCache");
  }
  dbKey = "";
  schema;
  nextMsgID = 0;
  querySet = [];
  callbacks;
  columns = [];
  kvClient;
  dbMap;
  raw = [];
  /** ctor */
  constructor(schema, dataContext2, appContext2) {
    this.dbKey = `${schema.dbKey}`;
    this.schema = schema;
    this.callbacks = /* @__PURE__ */ new Map();
    this.dbMap = /* @__PURE__ */ new Map();
    this.columns = this.buildColumnSchema(this.schema.sampleRecord);
    this.kvClient = new KvClient(this, dataContext2);
    this.kvClient.init(appContext2);
  }
  /** xor encryption */
  encryptText(text) {
    let result = "";
    const key = "ndhg";
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  }
  /** restore our cache from a json string */
  restoreCache(records) {
    const pwaObj = JSON.parse(records);
    this.dbMap = new Map(pwaObj);
    this.persist();
    const result = this.hydrate();
    if (result == "ok") {
      signals.fire("buildDataTableEV", this);
    }
  }
  /**
   * extract a set of column-schema from the DB.schema object
   */
  buildColumnSchema(obj) {
    const columns = [];
    for (const [key, value] of Object.entries(obj)) {
      let read_only = false;
      if (typeof value === "number" && value === -1 || typeof value === "string" && value === "READONLY") {
        read_only = true;
      }
      columns.push({
        name: key,
        type: typeof value,
        defaultValue: value,
        readOnly: read_only
      });
    }
    return columns;
  }
  /**
   * Persist the current dbMap to Kv   
   * This is called for any mutation of the dbMap (set/delete)
   */
  persist(order = true) {
    if (order) {
      this.dbMap = new Map([...this.dbMap.entries()].sort());
    }
    const mapString = JSON.stringify(Array.from(this.dbMap.entries()));
    const encrypted = this.encryptText(mapString);
    this.kvClient.set(encrypted);
  }
  /** hydrate a dataset from a single raw record stored in kvDB */
  hydrate() {
    this.raw = [...this.dbMap.values()];
    this.querySet = [...this.raw];
    signals.fire("buildDataTableEV", this);
    return this.raw.length > 2 ? "ok" : "Not found";
  }
  /** resest the working querySet to original DB values */
  resetData() {
    this.querySet = [...this.raw];
  }
  clean(what = null) {
    const cleanMap = /* @__PURE__ */ new Map();
    const keys = [...this.dbMap.keys()];
    keys.forEach((value) => {
      if (value !== what) {
        cleanMap.set(value, this.dbMap.get(value));
      }
    });
    this.dbMap = cleanMap;
    this.persist(true);
  }
  /** The `set` method mutates - will call the `persist` method. */
  set(key, value) {
    try {
      this.dbMap.set(key, value);
      this.persist(true);
      this.hydrate();
      return key;
    } catch (e) {
      console.error("error setting ");
      return "Error " + e;
    }
  }
  /** The `get` method will not mutate records */
  get(key) {
    try {
      const result = this.dbMap.get(key);
      return result;
    } catch (e) {
      return "Error " + e;
    }
  }
  /** The `delete` method mutates - will call the `persist` method. */
  delete(key) {
    try {
      const result = this.dbMap.delete(key);
      if (result === true) this.persist(true);
      this.hydrate();
      return result;
    } catch (e) {
      return "Error " + e;
    }
  }
};

// ../../Shared/signals.ts
function buildSignalBus() {
  const signalSubscriptions = /* @__PURE__ */ new Map();
  const newSignalBus = {
    /**
     * on - registers a handler function to be executed when a signal-event is fired
     * @param {key} signalName - signal name (one of `TypedSignals` only)!
     * @param {string} id - id of a target element (may be an empty string)
     * @param {Handler} handler - signal handler callback function
     */
    on(signalName, handler) {
      if (signalSubscriptions.has(signalName)) {
        const handlers = signalSubscriptions.get(signalName);
        handlers.push(handler);
      } else {
        signalSubscriptions.set(signalName, [handler]);
      }
    },
    /** 
     * fire - publish a named-signal event
     * executes all registered handlers for a named signal
     * @param {key} signalName - signal name - one of `TypedSignals` only!
     * @param {TypedSignals[key]} data - data payload, typed for this category of signal
     */
    fire(signalName, data) {
      const handlers = signalSubscriptions.get(signalName);
      if (handlers) {
        for (const handler of handlers) {
          handler(data);
        }
      }
    }
  };
  return newSignalBus;
}
__name(buildSignalBus, "buildSignalBus");
var signals = buildSignalBus();

// ../../Components/FootComponent.ts
var FooterComponent = class extends HTMLElement {
  static {
    __name(this, "FooterComponent");
  }
  static register() {
    customElements.define("footer-component", this);
  }
  addBtn;
  deleteBtn;
  shadow;
  /** ctor */
  constructor() {
    super();
    this.shadow = this.attachInternals()?.shadowRoot;
  }
  /** initialize this FooterComponent */
  init(table2) {
    this.addBtn = this.shadow.getElementById("addbtn");
    this.addBtn.onclick = (_e) => {
      table2.addNewRow();
    };
    this.deleteBtn = this.shadow.getElementById("deletebtn");
    this.deleteBtn.onclick = (_e) => {
      table2.deleteCurrentRow();
    };
    const fileLoad = this.shadow.getElementById("fileload");
    document.addEventListener("keydown", function(event) {
      if (event.ctrlKey && event.key === "b") {
        event.preventDefault();
        const jsonData = table2.getJsonDataSet();
        const link = document.createElement("a");
        const file = new Blob([jsonData], { type: "application/json" });
        link.href = URL.createObjectURL(file);
        link.download = "backup.json";
        link.click();
        URL.revokeObjectURL(link.href);
      }
      if (event.ctrlKey && event.key === "r") {
        event.preventDefault();
        fileLoad.click();
        fileLoad.addEventListener("change", function() {
          const reader = new FileReader();
          reader.onload = function() {
            table2.restoreCache(reader.result);
          };
          reader.readAsText(fileLoad.files[0]);
        });
      }
    });
  }
};
FooterComponent.register();

// ../../Components/TableComponent.ts
var TableComponent = class extends HTMLElement {
  static {
    __name(this, "TableComponent");
  }
  static register() {
    customElements.define("table-component", this);
  }
  APP_CTX;
  focusedCell;
  focusedRow;
  schema;
  cache;
  footer;
  table;
  tablehead;
  tableBody;
  shadow;
  constructor() {
    super();
    this.shadow = this.attachInternals()?.shadowRoot;
  }
  /** Initialize this component */
  init(schema, appContext2, cache2) {
    signals.on("buildDataTableEV", () => {
      this.buildDataTable();
    });
    this.APP_CTX = appContext2;
    this.schema = schema;
    this.cache = cache2;
    this.table = this.shadow.getElementById("table");
    this.tableBody = this.shadow.getElementById("table-body");
    this.tableBody.addEventListener("click", this);
    this.tablehead = this.shadow.getElementById("table-head");
    this.footer = document.getElementById("footer-component");
    this.footer.init(this);
    this.buildTableHead();
    return this;
  }
  handleEvent(e) {
    this[`handle${e.type}`](e);
  }
  handleclick(e) {
    const el = e.target;
    console.info("row click", el);
    console.info("row click", el.dataset);
    if (this.focusedRow && this.focusedCell && el !== this.focusedCell) {
      this.focusedCell.removeAttribute("contenteditable");
      this.focusedCell.className = "";
      this.focusedCell.oninput = null;
    }
    this.focusedRow?.classList.remove("selected_row");
    this.focusedRow = el.parentElement;
    this.focusedRow.classList.add("selected_row");
    this.APP_CTX.FocusedKey = this.focusedRow.dataset.cache_key;
    this.resetFooter(false);
    this.focusedCell = el;
    this.focusedCell.setAttribute("contenteditable", "");
    this.focusedCell.className = "editable ";
    let key = this.focusedRow.dataset.cache_key;
    let columnID = this.focusedCell.dataset.column_id;
    let columnIndex = parseInt(this.focusedCell.dataset.column_index) || 0;
    const rowObj = this.cache.get(key);
    this.focusedCell.onblur = () => {
      let thisValue = this.focusedCell.textContent;
      if (this.focusedCell.tagName === "SELECT") {
        columnID = this.focusedCell.parentElement.dataset.column_id || "";
        columnIndex = parseInt(this.focusedCell.parentElement.dataset.column_index) || 0;
        const theCell = this.focusedCell;
        const text = theCell.options[theCell.selectedIndex].text;
        thisValue = text;
      }
      if (rowObj[columnID] !== thisValue) {
        rowObj[columnID] = thisValue;
        if (columnIndex === 0) {
          if (key !== thisValue) {
            this.cache.delete(key);
            key = thisValue;
            this.cache.set(key, rowObj);
          }
        } else {
          this.cache.set(key, rowObj);
        }
      }
    };
  }
  /** scrollToBottom */
  scrollToBottom() {
    const lastRow = this.tableBody.rows[this.tableBody.rows.length - 1];
    lastRow.scrollIntoView({ behavior: "smooth" });
  }
  /** Build the Table header */
  buildTableHead() {
    const tr = '<tr class="headerRow">';
    let th = "";
    for (let i = 0; i < this.cache.columns.length; i++) {
      th += `   <th id="header${i + 1}" data-index=${i} value=1>${this.cache.columns[i].name}</th>`;
    }
    ;
    this.tablehead.innerHTML += tr + th + `</tr>`;
    for (let i = 0; i < this.cache.columns.length; i++) {
      const el = this.shadow.getElementById(`header${i + 1}`);
      el.onclick = (_e) => {
        this.resetFocusedRow();
        this.buildDataTable();
      };
    }
  }
  /** build an HTML table */
  buildDataTable() {
    this.tableBody.innerHTML = "";
    if (this.cache.querySet) this.buildRows();
    this.resetFocusedRow();
    this.focusedCell?.focus();
  }
  /** build an HTML table */
  buildRows() {
    const querySet = this.cache.querySet;
    if (querySet) {
      for (let i = 0; i < querySet.length; i++) {
        const obj = querySet[i];
        let row = `<tr data-cache_key="${obj[this.cache.columns[0].name]}">`;
        for (let i2 = 0; i2 < this.cache.columns.length; i2++) {
          const colName = this.cache.columns[i2].name;
          switch (this.cache.columns[i2].type) {
            case "boolean": {
              let checked = obj[colName] === "true" ? "checked" : "";
              row += `<td data-column_index=${i2} 
                  data-column_id="${colName}"><input type="checkbox" ${checked}></td>`;
              break;
            }
            case "number":
              row += `<td data-column_index=${i2} 
                  data-column_id="${colName}">${parseFloat(obj[colName])}</td>`;
              break;
            case "object":
              row += `<td data-column_index=${i2} 
                  data-column_id="${colName}">${this.buildSelect(
                this.cache.columns[i2].defaultValue,
                obj[colName]
              )}</td>`;
              break;
            default:
              row += `<td data-column_index=${i2} 
                  data-column_id="${colName}">${obj[colName]}</td>`;
              break;
          }
        }
        row += "</tr>";
        this.tableBody.innerHTML += row;
      }
    }
  }
  /** Build select element */
  buildSelect(options, selected) {
    let selectElement = `<select>
   `;
    options.forEach((option) => {
      if (selected === option) {
        selectElement += `<option value="${option}" selected>${option}</option>
         `;
      } else {
        selectElement += `<option value="${option}">${option}</option>
      `;
      }
    });
    selectElement += "</select>";
    return selectElement;
  }
  /** add a row to the cache */
  addNewRow() {
    const newRow = Object.assign({}, this.schema.sampleRecord);
    for (const property in newRow) {
      if (typeof newRow[property] === "object") {
        newRow[property] = newRow[property][0];
      }
    }
    const keyColName = this.schema.keyColumnName;
    this.cache.set(newRow[keyColName], newRow);
    this.buildDataTable();
    this.scrollToBottom();
  }
  /** delete a row from the cache */
  deleteCurrentRow() {
    this.cache.delete(this.APP_CTX.FocusedKey);
    this.buildDataTable();
  }
  /** get a JSON dataset for backup */
  getJsonDataSet() {
    return JSON.stringify(Array.from(this.cache.dbMap.entries()));
  }
  /** restore the cache from a JSON string */
  restoreCache(records) {
    this.cache.restoreCache(records);
  }
  /** reset any existing focused row */
  resetFocusedRow() {
    this.resetFooter(true);
    this.focusedRow = null;
  }
  /** reset footer buttons */
  resetFooter(reset) {
    if (reset) {
      this.footer.deleteBtn.setAttribute("hidden", "");
      this.footer.addBtn.removeAttribute("hidden");
    } else {
      this.footer.addBtn.setAttribute("hidden", "");
      this.footer.deleteBtn.removeAttribute("hidden");
    }
  }
};
TableComponent.register();

// main.ts
var thisSchema = {
  dbKey: "BP",
  keyColumnName: "What",
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
};
var appContext = {
  DEV: false,
  PIN: "",
  FocusedKey: ""
};
var dataContext = {
  LOCAL_DB: false,
  LocalDbURL: "http://localhost:9099/",
  RemoteDbURL: "https://dt-kv-rpc.deno.dev/",
  RpcURL: "SSERPC/kvRegistration"
};
var cache = new KvCache(thisSchema, dataContext, appContext);
var table = document.getElementById("table-component");
table.init(thisSchema, appContext, cache);
export {
  FooterComponent,
  TableComponent
};
