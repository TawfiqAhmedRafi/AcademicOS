# MongoDB Setup — Least-Privilege User for AOS Match

> **Do not run these commands automatically.**
> A DBA or the deploying developer should run them manually in `mongosh`.

## 1. Connect as admin

```bash
mongosh "mongodb://localhost:27017" -u admin -p
```

## 2. Create a custom role limited to the four match collections

```js
use academicos

db.createRole({
  role: "aosMatchReadWrite",
  privileges: [
    {
      resource: { db: "academicos", collection: "matchitems" },
      actions: [
        "find", "insert", "update", "remove",
        "createIndex", "listIndexes"
      ]
    },
    {
      resource: { db: "academicos", collection: "matchbatches" },
      actions: ["find", "insert", "remove"]
    },
    {
      resource: { db: "academicos", collection: "matchlogs" },
      actions: ["find", "insert"]
    },
    {
      resource: { db: "academicos", collection: "matchvocab" },
      actions: ["find", "insert", "update", "remove"]
    },
    {
      // Needed for store.collections_snapshot() / list_collection_names()
      resource: { db: "academicos", collection: "" },
      actions: ["listCollections"]
    }
  ],
  roles: []
})
```

## 3. Create the service user

```js
db.createUser({
  user: "aos_match_svc",
  pwd: "CHANGE_ME_TO_A_STRONG_PASSWORD",
  roles: [
    { role: "aosMatchReadWrite", db: "academicos" }
  ]
})
```

## 4. Use in `.env`

```env
MONGO_URI=mongodb://aos_match_svc:CHANGE_ME_TO_A_STRONG_PASSWORD@localhost:27017/academicos?authSource=academicos
MONGO_DB=academicos
```

## What this user CAN do

- Read/write `matchitems`, `matchbatches`, `matchlogs`, `matchvocab`
- Create indexes on `matchitems`
- List collection names (for the pre-flight safety check)

## What this user CANNOT do

- Access any other collection in the database
- Drop collections or databases
- Create users or roles
- Read/write to other databases
