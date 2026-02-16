var fs=require("fs");
var p="C:/Users/newpa/Downloads/evidly-demo-final/evidly-app-main/supabase/migrations/20260213000000_enterprise_tenant_tables.sql";
var d=fs.readFileSync(0,"utf8").replace(/_SQ_/g,String.fromCharCode(39)).replace(/_DQ_/g,String.fromCharCode(34));
fs.writeFileSync(p,d);
console.error("Wrote "+d.length+" bytes");
