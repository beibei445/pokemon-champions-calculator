// Local development and integration tests only; never included in the hosted Worker.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,mkdirSync} from 'node:fs';
export function localDB(filename=':memory:'){
 const sqlite=new DatabaseSync(filename);
 sqlite.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
 for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort()){
  if(sqlite.prepare('SELECT name FROM local_migrations WHERE name = ?').get(name))continue;
  sqlite.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
  sqlite.prepare('INSERT INTO local_migrations (name) VALUES (?)').run(name);
 }
 return {close:()=>sqlite.close(),prepare(sql){
  const statement=sqlite.prepare(sql);let args=[];
  const prepared={bind(...values){args=values;return prepared},async all(){return {results:statement.all(...args)}},async first(){return statement.get(...args)??null},async run(){return {meta:{changes:Number(statement.run(...args).changes)}}}};return prepared;
 }};
}
