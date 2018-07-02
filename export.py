import sys
import json
import numpy as np

if len(sys.argv)!=2:
    print('.py json')
    exit(-1)

jsonName=sys.argv[1]

with open(jsonName,'r') as fin:
    data=json.load(fin)

res=data['results']
for r in res:
    if (r['nfactors']==3):
        to_use=r
        break

with open(jsonName.replace('.json','.factors.tsv'),'w') as ftsv:
    for fac in to_use['factors']:
        ftsv.write(fac['name']+'\t'+'\t'.join(['{0}'.format(x) for x in fac['patt']])+'\n')

cities={c:i for i,c in enumerate(set([p['city'] for p in to_use['pmsa']]))}
world={w:i for i,w in enumerate(set([p['world'] for p in to_use['pmsa']]))}
m=np.zeros((len(cities),len(world),3))
for p in to_use['pmsa']:
    m[cities[p['city']],world[p['world']],:]=p['weights']

cList=sorted(list(cities.keys()),key=lambda x:cities[x])
wList=sorted(list(world.keys()),key=lambda x:world[x])
with open(jsonName.replace('.json','.tsv'),'w') as ftsv:
    header='city'
    for w in wList:
        header=header+'\t'+'\t'.join(['{0}_W{1}'.format(w[0],i) for i in range(3)])
    header=header+'\n'
    ftsv.write(header)
    for city in cList:
        ftsv.write(city+'\t'+'\t'.join(['{0}'.format(x) for x in np.squeeze(m[cities[city],0,:]).tolist()])+
                        '\t'+'\t'.join(['{0}'.format(x) for x in np.squeeze(m[cities[city],1,:]).tolist()])+
                        '\t'+'\t'.join(['{0}'.format(x) for x in np.squeeze(m[cities[city],2,:]).tolist()])+'\n')


