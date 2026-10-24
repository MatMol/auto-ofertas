import sqlite3, pathlib
c=sqlite3.connect(':memory:')
for file in sorted(pathlib.Path('web/drizzle').glob('*.sql')): c.executescript(file.read_text())
base="INSERT INTO listings(id,source,source_id,source_url,brand,model,year,price,currency,price_kind,location,province,created_at,updated_at) VALUES('a','test','a','https://example.com','Toyota','Corolla',2022,100,'ARS','total','CABA','CABA','first','first')"
c.execute(base)
c.execute("UPDATE listings SET price=90, updated_at='second' WHERE id='a'")
c.execute("UPDATE listings SET price_ars=12345 WHERE id='a'")
assert c.execute("SELECT COUNT(*) FROM price_history").fetchone()[0]==2
assert c.execute("SELECT created_at FROM listings").fetchone()[0]=='first'
print('Migration and price history checks passed (in-memory SQLite).')
