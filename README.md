# KV-Cache-PWA
  - Pure vanilla HTML, CSS, javascript application - no frameworks
  - Zero dependencies

## About this Proof Of Concept demo
 - All data is persisted and hydrated as a single key-value record in KvDB.       
 - Data hydrates to an es6-Map (cache) using JSON.parse()    
 - The cache data is persisted in KvDB using JSON.stringyfy()    
 - Any mutation to the cache triggers a flush of the full dataset to KvDB.    

## Run live at https://nhrones.github.io/DT-BP/

NOTE: The three files `index.html`, `bundle.js`, and `styles.css`, all come from `/Apps/Base/`.    
These are common shared assets, and the build/bundle process only happens there.    
Only `main.js` is unique in this app folder.