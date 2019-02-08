import numpy as np
import pandas as pd
import matplotlib.pylab as plt
from sklearn.decomposition import NMF
import json
import networkx as nx

import sys

if len(sys.argv)!=3:
    print('.py minPOP (thousands) out.json')
    exit(-1)

MINPOP=int(sys.argv[1])*1000

csvs={'hh':('pred.gam.msa.hh.csv',0), 
      'niche':('pred.gam.msa.niche.csv',1),  
      'rock':('pred.gam.msa.rock.csv',2)}

id2w={0:'HipHop',1:'Niche',2:'Rock'}

name="PMSA.Name"
popField='TotalPopMSAPMSA'


popdf=pd.read_csv('ms.fabio.csv')
popdf=popdf.filter(items=[name,popField])
popdf.dropna(subset=(name,),inplace=True)
popdf.dropna(subset=(popField,),inplace=True)
popdf.drop_duplicates(subset=(name,),inplace=True)
popdf=popdf[ popdf[popField]>MINPOP]
pop=dict()
for index, row in popdf.iterrows():
    pop[row[name]]=row[popField]
print('cities read')
# popdf.set_index((name,),inplace=True)

cities=list(set(popdf[name]))
c2i={}
i2c={}
i=0
for c in cities:
    for w in id2w:
        c2i[(c,w)]=i
        i2c[i]=(c,w)
        i+=1

M=np.zeros((3*len(cities),100))   

for kind in csvs:
    print(kind)
    df=pd.read_csv(csvs[kind][0])
    df.dropna(subset=(name,),inplace=True)
    for c in cities:
        if (c not in pop):
            pop[c]=-1

    w=csvs[kind][1]
    for c in cities:
        cdf = df[ df[name]==c ]
        y=cdf['pred'].values
        M[c2i[(c,w)],:] = y#(y-np.min(y))/(np.max(y)-np.min(y))

minM=np.min(M)
if minM<0:
    M=M-minM

res={}
res['minFactors']=3
res['maxFactors']=10
res['results']=[]

for nc in range(res['minFactors'],res['maxFactors']+1):
    cRes={'nfactors':nc}    

    model = NMF(n_components=nc, init='nndsvd',alpha=0.01)
    W = model.fit_transform(M)
    P = model.components_

    G = nx.Graph()                                        
    fixed={}

    for i in range(P.shape[0]):
        nName='{0}'.format(i+1)
        G.add_node(nName)
        theta=(2*np.pi/nc)*i
        fixed[nName]=[np.cos(theta)/2 +0.5,np.sin(theta)/2 +0.5]

    sw=np.sum(W,axis=0)

    cRes['factors']=[]
    for i in range(P.shape[0]):
        nName='{0}'.format(i+1)
        cRes['factors'].append({'name':'{0}'.format(i+1), 'order':i,'coords': fixed[nName],'patt':P[i,:].tolist(),'globalWeight':sw[i],'normGlobalWeight':sw[i]/np.sum(sw)})

    for CW in range(W.shape[0]):
        c,w=i2c[CW]
        # W[CW,:]=W[CW,:]/np.sum(W[CW,:])
        newNodeName=c+' - '+id2w[w]
        G.add_node(newNodeName)
        for i in range(W.shape[1]):
            nName='{0}'.format(i+1)
            G.add_edge(newNodeName,nName)
            G[newNodeName][nName]['weight']=W[CW,i]+1e-9
    

    G.add_node('center')
    for n in G.nodes():
        if ('P' not in n):
            G.add_edge('center',n)
            G['center'][n]['weight']=1e-9

    pos=nx.spring_layout(G,pos=fixed,k=1/np.sqrt(len(G)),fixed=list(fixed.keys()))
    del(pos['center'])
    G.remove_node('center')



    cRes['pmsa']=[]
    for CW in range(W.shape[0]):
        c,w=i2c[CW]
        newNodeName=c+' - '+id2w[w]
        cRes['pmsa'].append({'name' : newNodeName,
                             'city' : c,
                             'world' : id2w[w],
                             'coords' : pos[newNodeName].tolist(),
                             'weights' : W[CW,:].tolist(),
                             'pop': pop[c],
                             'patt': (M[CW,:]+minM).tolist()})
    res['results'].append(cRes)
                                            

with open(sys.argv[2],'w') as fout:
    json.dump(res,fout)        

