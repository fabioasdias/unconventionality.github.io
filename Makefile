all:  m2 m1.5 m1 k500 full
	echo 'DONE'
full: generatejson.py pred.gam.msa.hh.csv pred.gam.msa.niche.csv pred.gam.msa.rock.csv ms.fabio.csv
	python3 generatejson.py 0 ./public/dataFull.json
k500: generatejson.py pred.gam.msa.hh.csv pred.gam.msa.niche.csv pred.gam.msa.rock.csv ms.fabio.csv	
	python3 generatejson.py 500 ./public/data500k.json
m1: generatejson.py pred.gam.msa.hh.csv pred.gam.msa.niche.csv pred.gam.msa.rock.csv ms.fabio.csv	
	python3 generatejson.py 1000 ./public/data1M.json
m1.5: generatejson.py pred.gam.msa.hh.csv pred.gam.msa.niche.csv pred.gam.msa.rock.csv ms.fabio.csv	
	python3 generatejson.py 1500 ./public/data1.5M.json
m2: generatejson.py pred.gam.msa.hh.csv pred.gam.msa.niche.csv pred.gam.msa.rock.csv ms.fabio.csv	
	python3 generatejson.py 2000 ./public/data2M.json
