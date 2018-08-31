import React, { Component } from 'react';
import {XYPlot, LineSeries, MarkSeries, XAxis, YAxis, LabelSeries} from 'react-vis';
import "./style.css";
import './App.css';
function range(start, end) {
  return Array(end - start + 1).fill().map((_, idx) => start + idx)
}
function uniq(a) {
  var seen = {};
  return a.filter(function(item) {
      return seen.hasOwnProperty(item) ? false : (seen[item] = true);
  });
}

function getColours(){
  let colours={};
    colours['Patterns']='darkgrey';
    if (true){
      colours['Rock']='#1b9e77'; 
      colours['HipHop']='#d95f02';
      colours['Niche']='#7570b3';  
    }else{
      colours['Rock']='black'; 
      colours['HipHop']='grey';
      colours['Niche']='white';
    }
  return(colours);
}

function oneHot(N,I){
  let ret=[];
  for (let i=0;i<N;i++){
    if (i===I){
      ret.push(1);
    }else{
      ret.push(0);
    }
  }
  return(ret);
}

function findMinMax(A){
  let cMin=A[0].patt[0];
  let cMax=A[0].patt[0];
  let tMin,tMax;
  for (let i=0;i<A.length;i++){
    tMin=Math.min(...(A[i].patt));
    tMax=Math.max(...(A[i].patt));
    cMin=Math.min(tMin,cMin);
    cMax=Math.max(tMax,cMax);
  }
  return([cMin,cMax]);
}
const getData = (url,actionThen) => {
  fetch(url)
  .then((response) => {
    if (response.status >= 400) {throw new Error("Bad response from server");}
    return response.json();
  })
  .then(actionThen);
}

function fixByCity(d){
  let cities=[];
    cities.push(...d.pmsa.map((e)=>{
      return(e.city);
    }));    
  cities=uniq(cities);  
  cities.sort();
  let ret=cities.map((e)=>{
    return({city:e})
  });
  for (let p of d.pmsa){
    ret[cities.indexOf(p.city)][p.world]=p.line;
  }
  return({cities:cities,ret:ret});
}

function fixLine(data){
  for (let i=0;i<data.results.length;i++){
    data.results[i].pmsa=data.results[i].pmsa.map((d)=> {
      return({...d,
              'line':d.patt.map((d,i)=>{
                return({'x':i/100,'y':d});
              })
            });
    });
    data.results[i].factors=data.results[i].factors.map((d,J)=> {
      return({...d,
              'weights':oneHot(data.results[i].nfactors,J),
              'line': d.patt.map((d,i)=>{
                return({'x':i/100,'y':d});
              })
            });
    });  
  }
  return(data);
}


class App extends Component {
  constructor(props){
    super(props);
    this.state={data:{},current:{pmsa:[],factors:[]},byCity:[],cities:[]};
  }


  componentDidMount() {

    getData('./data500k.json',(d)=>{
      let data=this.state.data;
      d=fixLine(d);

      data.k500=d;
      let cExt = findMinMax(data.k500.results[0].pmsa);      
      let byCity = fixByCity(data.k500.results[0]);

      this.setState({current:data.k500.results[0], 
        byCity:byCity.ret,
        cities:byCity.cities,
        extended: byCity.cities.map((d)=>{return(false)}),
        data:data, 
        cName:'k500',
        factors:data.k500.results[0].nfactors, 
        cCity:undefined,
        hint:undefined,
        cMin:cExt[0],
        cMax:cExt[1],
       });
    })
    let urls=['./dataFull.json','./data1M.json','./data1.5M.json','./data2M.json'];
    let names=['full','M1','M15','M2']
    for (let i=0;i<urls.length;i++){
      getData(urls[i], (d)=>{
        let data=this.state.data;
        d=fixLine(d);
        data[names[i]]=d;
        this.setState({data:data});
      })
    }  
  }

  render() {
    let remember=(d)=>{
      if (!this.state.fixed){
        let cExt=this.state.extended.slice();
        cExt[this.state.cities.indexOf(d.city)]=true;
        this.setState({hint:d,cCity:d.city,extended:cExt,fixed:false});
      }
    };
    let fixed=(d)=>{
      let cExt=this.state.extended.slice();
      cExt[this.state.cities.indexOf(d.city)]=true;
      this.setState({hint:d,cCity:d.city,extended:cExt,fixed:true});
    };

    let forget=(d)=>{
      if (!this.state.fixed){
        let cExt=this.state.extended.slice();
        cExt[this.state.cities.indexOf(d.city)]=false;
        this.setState({hint:undefined,cCity:undefined,extended:cExt});  
      }
    }

    let changeFactors=(d)=>{
      let f=d.target.value;
      let newc=this.state.data[this.state.cName].results.filter((d)=>{return(+d.nfactors===+f);})[0];
      let cExt=findMinMax(newc.pmsa);
      let vals=fixByCity(newc);
      this.setState({current:newc,
                     factors:+f,
                     byCity: vals.ret,
                     cities: vals.cities,
                     cMin:cExt[0],
                     cMax:cExt[1]});
    }
    let changeThres=(d)=>{
      let k=d.target.value;
      let newc=this.state.data[k].results.filter((d)=>{return(d.nfactors===this.state.factors);})[0];
      let cExt=findMinMax(newc.pmsa);
      let vals=fixByCity(newc);
      this.setState({current:newc,
                     cName:k,
                     byCity: vals.ret,
                     cities: vals.cities,
                     cMin:cExt[0],
                     cMax:cExt[1]})
    }
    let colours=getColours();

    let clegend=[];
    for (let w in colours){
      clegend.push({title:w, color:colours[w], border: (w==='Patterns')?'black':'darkgrey'});
    }
    let nFactors=[];
    if (this.state.data.k500!==undefined){
      nFactors=range(this.state.data.k500.minFactors,this.state.data.k500.maxFactors);
    }
    let RedExt=(e)=>{
      let c=parseInt(e.target.getAttribute('data-cluster'),10);
      let cExtended=this.state.extended.slice();
      cExtended[c]=!cExtended[c]
      this.setState({extended:cExtended});
  }
  

    let cFactors=[];
    if (this.state.hint!==undefined){
      let order=range(0,this.state.hint.weights.length-1).sort((a,b)=>{return(this.state.hint.weights[a]<this.state.hint.weights[b]);});
      for (let i=0;i<order.length;i++){
        if (this.state.hint.weights[order[i]]>0){
          cFactors.push(this.state.current.factors[order[i]]);
        }
      }
    }
    else{
      cFactors=this.state.current.factors.slice()
    }
    return (
      <div className="outerApp">
        <div className="App">


          <div style={{display:'block'}}>
            {/*<div style={{display:'flex',width:'fit-content',border:'solid',borderWidth:'thin',height:'fit-content',margin:'5px',padding:'5px'}}>
              <div style={{display:'flex',width:'200px',height:'fit-content',margin:'auto'}}>          
                <p>Number of factors</p>
                <select style={{height:'2em',margin:'auto'}}
                  onChange={changeFactors}>          
                  {nFactors.map((d)=>{
                    return(<option 
                            selected={d===this.state.factors}
                            key={d}
                            value={d}>
                          {d}
                          </option>)
                  })}
                </select>          
              </div> 
              <div style={{display:'flex',width:'200px',height:'fit-content',margin:'auto'}}>          
                <p>Min. population</p>
                <select 
                  style={{height:'2em',margin:'auto'}}
                  onChange={changeThres}>          
                  <option key={0} value={'full'} selected={this.state.cName==='full'}>0</option>
                  <option key={1} value={'k500'} selected={this.state.cName==='k500'}>500k</option>
                  <option key={2} value={'M1'}   selected={this.state.cName==='M1'}>1M</option>
                  <option key={3} value={'M15'}  selected={this.state.cName==='M15'}>1.5M</option>
                  <option key={4} value={'M2'}   selected={this.state.cName==='M2'}>2M</option>
                  })}
                </select>          
              </div>
              </div>*/}

              <div style={{width:'400px',border:'solid',borderWidth:'thin',height:'780px',overflowY:'scroll',overflowX:'hidden',margin:'5px',padding:'5px'}}>
              {cFactors.map((C,i)=>{
                return(<div style={{width:'fit-content'}}>
                  <p style={{width:'fit-content',margin:'auto'}}>
                    {C.name +' - '+ (
                        (this.state.hint!==undefined)?
                        'W: '+this.state.hint.weights[C.order].toFixed(3).toString()+' ('+(100*(this.state.hint.weights[C.order]/this.state.hint.weights.reduce((a, b) => a + b, 0))).toFixed(2).toString() +'%)'
                        :(100*(+C.normGlobalWeight).toFixed(2).toString()+'%')
                      )
                    }
                  </p>
                  <div style={{width:'fit-content',margin:'auto'}}>
                  <XYPlot
                    width={350}
                    height={200}
                    // yRange={[0,10]}
                    // yDomain={[this.state.cMin,this.state.cMax]}
                    >
                    <XAxis title="Unconventionality"/>
                    <YAxis title="Popularity"/>

                    <LineSeries
                      size={1}
                      color={"black"}
                      strokeStyle={'dashed'}
                      data={C.line}
                    />
                  </XYPlot>
                  </div>
                </div>)
              })}
            </div>
          </div>


          <div className="plot">
            <XYPlot
              getX={d=>d.coords[0]}
              getY={d=>d.coords[1]}
              getColor={(d)=>((d.world===undefined)?'darkgrey':colours[d.world])}
              getOpacity={(d)=>((this.state.cCity===d.city)||(this.state.cCity===undefined)||(d.city===undefined))?1:0.2}
              getSize={(d)=>(d.pop===undefined)?200:(d.pop)}
              sizeRange={[3,15]}
              colorType="literal"
              width={750}
              height={750}>
              <MarkSeries
                onValueMouseOver={remember}
                onValueClick={fixed}
                onValueMouseOut={forget}        
                strokeWidth={2}
                stroke="darkgrey"
                data={this.state.current.pmsa}
                />
              <MarkSeries
                onValueMouseOver={remember}
                onValueClick={fixed}
                onValueMouseOut={forget}                
                stroke="black"
                opacity={1}
                strokeWidth={2}
                markType={'star'}
                data={this.state.current.factors}
                />          
              <LabelSeries
                getLabel={d=>d.name}
                data={this.state.current.factors}
                />          

              <div style={{display:'flex',width:'fit-content'}}>
                      {clegend.map((d)=>{
                        return(<div key='a' style={{display:'flex',width:'100px',color:'black'}}>
                                <div style={{width:'1em',height:'1em',backgroundColor:d.color,border:'solid',borderColor:d.border}}></div>
                                <div><p style={{width:'fit-content',height:'fit-content',margin:'auto'}}>{d.title}</p></div>
                              </div>);
                      })}
                      <div style={{paddingLeft: '360px'}}>
                        <button onClick={(d)=>{
                          this.setState({fixed:false,hint:undefined,cCity:undefined,extended:this.state.extended.map((d)=>{return(false)})});
                          }
                        } alt="clear selection">
                        X
                        </button>
                      </div>
              </div>

            </XYPlot>
          </div>

          <div style={{width:'430px',border:'solid',borderWidth:'thin',height:'780px',overflowY:'scroll',overflowX:'hidden',margin:'5px',padding:'5px'}}>
            {this.state.byCity.map((C,I)=>{
              let plot=[];
              if (this.state.extended[I]){
                plot.push(<XYPlot
                  width={400}
                  height={200}
                  // yRange={[0,10]}
                  // yDomain={[this.state.cMin,this.state.cMax]}
                  >
                  <LineSeries
                    size={1}
                    stroke={'darkgrey'}
                    strokeWidth={5}
                    data={C.Rock}
                  />
                  <LineSeries
                    size={1}
                    strokeWidth={2}
                    color={colours['Rock']}
                    data={C.Rock}
                  />

                  <LineSeries
                    size={1}
                    stroke={'darkgrey'}
                    strokeWidth={5}
                    data={C.Niche}
                  />
                  <LineSeries
                    size={1}
                    strokeWidth={2}
                    color={colours['Niche']}
                    data={C.Niche}
                  />

                  <LineSeries
                    size={1}
                    stroke={'darkgrey'}
                    strokeWidth={5}
                    data={C.HipHop}
                  />
                  <LineSeries
                    size={1}
                    strokeWidth={2}
                    color={colours['HipHop']}
                    data={C.HipHop}
                  />
                  <XAxis title="Unconventionality"/>
                  <YAxis title="Popularity"/>
                </XYPlot>);

              }
              return(<div style={{width:'fit-content',border:'solid',borderWidth:'thin',borderColor:'lightgray',margin:'2px',padding:'2px'}}>
                <div style={{width:'400px',display:'flex'}}>
                  <p 
                    style={{width:'fit-content',
                            margin:'auto',
                            color:(this.state.cCity===C.city)?'black':'darkgrey',
                            fontWeight:(this.state.cCity===C.city)?'bolder':'normal',
                          }}
                    onClick={(d)=>{
                      let cExt=this.state.extended;
                      cExt[this.state.cities.indexOf(C.city)]=true;
                      this.setState({cCity:C.city,extended:cExt,fixed:true});
                    }}
                    >
                      {C.city}
                    </p>
                  <img 
                          src={this.state.extended[I]?"chevron-top.svg":"chevron-bottom.svg"}
                          title={this.state.extended[I]?"Collapse":"Expand"}
                          alt={this.state.extended[I]?"Collapse":"Expand"}
                          height="16" 
                          width="16" 
                          data-cluster={I}                            
                          onClick={RedExt}                            
                          style={{verticalAlign:'middle',cursor:'pointer'}}>
                      </img>
                </div>
                <div style={{width:'fit-content',margin:'auto'}}>
                  {plot}
                </div>
              </div>)
            })}
          </div>
        </div>
      </div>
    
    );
  }
}

export default App;
