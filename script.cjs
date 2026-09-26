const fs = require('fs');
let code = fs.readFileSync('src/reports.tsx', 'utf8');

const regex1 = /const navigate=useNavigate\(\),canEdit=useCanEdit\(\);/s;
const replace1 = `const navigate=useNavigate(),canEdit=useCanEdit();const [confirming,setConfirming]=useState<ReportSetup|undefined>();`;

const regex2 = /<button className="button primary full".+?<\/button><\/section>/s;

const replace2 = `<button className="button primary full" disabled={!setup||busy||!canEdit} onClick={()=>{setError('');setConfirming(setup);}}>Create result draft <ArrowRight size={17}/></button></section>
{confirming?<Dialog title="Confirm Report Specification" onClose={()=>setConfirming(undefined)} wide>
  <div className="padded">
    <p>The following tests will be included in the report for <strong>{confirming.specification.product}</strong> based on the <em>{confirming.specification.context}</em> specification from the QC Micro Products Specifications sheet:</p>
    <div className="table-scroll" style={{maxHeight:'40vh',margin:'15px 0'}}>
      <table>
        <thead>
          <tr>
            <th style={{width:'40px',textAlign:'center'}}><input type="checkbox" checked readOnly /></th>
            <th>Test Parameter</th>
            <th>Standard Specification</th>
          </tr>
        </thead>
        <tbody>
          {confirming.specification.tests.map((t:any,i:number)=>(
            <tr key={i}>
              <td style={{textAlign:'center'}}><input type="checkbox" checked readOnly /></td>
              <td>{t.label}</td>
              <td>{t.criterion}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="sticky-actions" style={{justifyContent:'flex-end',gap:'10px',background:'transparent',padding:'0',borderTop:'none',boxShadow:'none'}}>
      <button className="button secondary" disabled={busy} onClick={()=>setConfirming(undefined)}>Cancel</button>
      <button className="button primary" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const draft=await api('/drafts','POST',{sampleId:selected});navigate(\`/reports/\${draft.id}\`);}catch(e:any){setError(e.message);}finally{setBusy(false);}}}>{busy?'Preparing...':'Confirm & Create Draft'}</button>
    </div>
  </div>
</Dialog>:null}`;

if(regex1.test(code) && regex2.test(code)) {
  code = code.replace(regex1, replace1).replace(regex2, replace2);
  fs.writeFileSync('src/reports.tsx', code);
  console.log('Success');
} else {
  console.log('Regex not found');
  if(!regex1.test(code)) console.log('regex1 failed');
  if(!regex2.test(code)) console.log('regex2 failed');
}
