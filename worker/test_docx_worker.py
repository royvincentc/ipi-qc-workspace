import io,json,tempfile,unittest,zipfile
from pathlib import Path
from docx_worker import demo_template,render,inventory,validate_template,prepare_template,package,roots,text,NS,W,upgrade_environmental_layout

class DocumentTests(unittest.TestCase):
    def test_overall_passed_is_bold_underlined_without_styling_label(self):
        from lxml import etree as E
        from docx_worker import replace_tokens
        for token in ['overallRemarks','overall.remarks']:
            p=E.fromstring(('<w:p xmlns:w="'+NS['w']+'"><w:r><w:t>REMARKS: {{'+token+'}} end</w:t></w:r></w:p>').encode())
            replace_tokens(p,{token:'PASSED'})
            self.assertEqual(text(p),'REMARKS: PASSED end')
            passed=p.xpath('./w:r[w:t="PASSED"]',namespaces=NS)[0]
            self.assertEqual(passed.xpath('./w:rPr/w:b/@w:val',namespaces=NS),['1'])
            self.assertEqual(passed.xpath('./w:rPr/w:u/@w:val',namespaces=NS),['single'])
            self.assertFalse(p.xpath('./w:r[w:t="REMARKS: "]/w:rPr/w:b',namespaces=NS))

    def test_environmental_data_weight_preserves_bold_headings(self):
        from docx import Document
        d=Document(self.template);header=d.sections[0].header
        header.add_paragraph().add_run('{{sample.name}}').bold=True
        heading=header.add_paragraph();heading.add_run('MICROBIOLOGY ANALYSIS REPORT').bold=True
        for col in [2,3]:
            for run in d.tables[0].cell(1,col).paragraphs[0].runs:run.bold=True
        source=self.folder/'bold.docx';d.save(source);out=self.folder/'regular.docx';upgrade_environmental_layout(source.read_bytes(),out)
        docs=roots(package(out.read_bytes()))
        metadata=next(p for n,r in docs.items() if 'header' in n for p in r.xpath('.//w:p',namespaces=NS) if '{{sample.name}}' in text(p))
        self.assertEqual(metadata.xpath('./w:r/w:rPr/w:b/@w:val',namespaces=NS),['0'])
        heading=next(p for n,r in docs.items() if 'header' in n for p in r.xpath('.//w:p',namespaces=NS) if text(p)=='MICROBIOLOGY ANALYSIS REPORT')
        self.assertNotEqual(heading.xpath('./w:r/w:rPr/w:b/@w:val',namespaces=NS),['0'])
        for token in ['{{value}}','{{remarks}}']:
            p=next(p for p in docs['word/document.xml'].xpath('.//w:p',namespaces=NS) if token in text(p))
            self.assertEqual(p.xpath('./w:r/w:rPr/w:b/@w:val',namespaces=NS),['0'])
    def test_environmental_analyst_date_excludes_time_but_release_header_keeps_it(self):
        from docx import Document
        d=Document(self.template);d.add_paragraph('Date&Time Released: {{releaseDate}}');d.sections[0].footer.add_paragraph('Date: {{releaseDate}}')
        source=self.folder/'dated.docx';d.save(source);upgraded=self.folder/'dated-upgraded.docx';upgrade_environmental_layout(source.read_bytes(),upgraded)
        fields={k:'' for k in validate_template(upgraded.read_bytes())['tokens']};fields.update({'releaseDate':'10/08/2026 @ 11:23 AM','d.release':'10/08/2026'})
        output=self.folder/'dated-result.docx';render(upgraded,{'fields':fields,'rows':[{'test':'SPC','criterion':'Nmt 100','value':'0','remarks':'Passed'}]},output)
        docs=roots(package(output.read_bytes()))
        self.assertIn('Date&Time Released: 10/08/2026 @ 11:23 AM',text(docs['word/document.xml']))
        footer=' '.join(text(r) for n,r in docs.items() if 'footer' in n)
        self.assertIn('Date: 10/08/2026',footer);self.assertNotIn('11:23',footer)
    def test_environmental_layout_upgrade_and_empty_block_override(self):
        source=self.environmental_fixture(blocks=1);template=self.folder/'prepared.docx';prepare_template(source.read_bytes(),template)
        upgraded=self.folder/'upgraded.docx';upgrade_environmental_layout(template.read_bytes(),upgraded)
        tokens=validate_template(upgraded.read_bytes())['tokens']
        self.assertIn('facility',tokens);self.assertIn('area',tokens);self.assertIn('type',tokens)
        fields={k:'' for k in tokens};fields.update({'facility':'PF2','area':'Compounding','type':'Hair and Body Care'})
        rows=[{'test':'SPC','location':str(i),'criterion':'Nmt 100 cfu','value':str(i),'remarks':'Passed','groupKey':'SPC'} for i in range(2)]
        out=self.folder/'rendered.docx';render(upgraded,{'fields':fields,'rows':rows,'renderOptions':{'environmental':True,'blocks':{'tests':{'mergeColumns':[]}}}},out)
        docs=roots(package(out.read_bytes()));root=docs['word/document.xml']
        self.assertIn('PF2 Compounding Area (Hair and Body Care)',' '.join(text(r) for r in docs.values()))
        for col in [1,3]:self.assertEqual(len(root.xpath(f'.//w:tr/w:tc[{col}]/w:tcPr/w:vMerge',namespaces=NS)),2)
        for col in [2,4,5]:self.assertEqual(len(root.xpath(f'.//w:tr/w:tc[{col}]/w:tcPr/w:vMerge',namespaces=NS)),0)
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.folder=Path(self.tmp.name);self.template=self.folder/'template.docx';demo_template(self.template)
    def tearDown(self):self.tmp.cleanup()
    def test_no_historical_results_in_template(self):
        report=inventory(self.template.read_bytes())
        all_text=' '.join(p['text'] for p in report['paragraphs'])
        self.assertNotIn('Passed',all_text);self.assertNotIn('Negative',all_text)
    def test_actual_zero_and_units_survive_generation(self):
        payload={'fields':{'sample.name':'Example','sample.ml':'ML-FG-26-0001','sample.batch':'B1','sample.received':'2026-09-23','analysisDate':'2026-09-24','logbookReference':'MIC-1 p.5','analyst':'Development analyst'},'rows':[{'test':'SPC','criterion':'Nmt 50 cfu/g','value':'0 cfu/g','remarks':''},{'test':'Molds and Yeast','criterion':'Nmt 10 cfu/g','value':'Nmt 10 cfu/g','remarks':''}]}
        output=self.folder/'generated.docx';render(self.template,payload,output)
        parts=package(output.read_bytes());all_text=' '.join(text(r) for r in roots(parts).values())
        self.assertIn('0 cfu/g',all_text);self.assertNotIn('{{',all_text);self.assertNotIn('Passed',all_text)
        original=roots(package(self.template.read_bytes()))['word/document.xml'];actual=roots(parts)['word/document.xml']
        from lxml import etree as E
        self.assertEqual(E.tostring(original.find('.//{'+NS['w']+'}sectPr')),E.tostring(actual.find('.//{'+NS['w']+'}sectPr')))
    def test_page_fields_preserved(self):
        info=validate_template(self.template.read_bytes());self.assertIn('sample.ml',info['tokens'])
    def test_unresolved_tokens_fail(self):
        with self.assertRaises(ValueError):render(self.template,{'fields':{},'rows':[]},self.folder/'bad.docx')
    def test_external_relationships_rejected(self):
        source=zipfile.ZipFile(self.template);out=io.BytesIO()
        with zipfile.ZipFile(out,'w') as z:
            for n in source.namelist():z.writestr(n,source.read(n))
            z.writestr('word/test.rels',b'<Relationship TargetMode="External" Target="https://example.org"/>')
        with self.assertRaises(ValueError):package(out.getvalue())
    def test_preparation_removes_historical_name_and_list_marker(self):
        from docx import Document
        from docx.oxml import OxmlElement
        d=Document();d.core_properties.author='Historical Analyst'
        h=d.sections[0].header;h.add_paragraph('Requested by');h.add_paragraph(':');p=h.add_paragraph('Historical Analyst')
        num=OxmlElement('w:numPr');p._p.get_or_add_pPr().append(num)
        source=self.folder/'historical.docx';output=self.folder/'prepared.docx';d.save(source)
        prepare_template(source.read_bytes(),output);parts=package(output.read_bytes());header=roots(parts)['word/header1.xml']
        self.assertNotIn('Historical Analyst',text(header))
        value=next(p for p in header.xpath('.//w:p',namespaces=NS) if '{{requestedBy}}' in text(p))
        self.assertEqual(value.xpath('./w:pPr/w:numPr',namespaces=NS),[])
        from lxml import etree as E
        self.assertEqual(len(E.fromstring(parts['docProps/core.xml'])),0)
    def test_preparation_removes_incubation_instruction_but_keeps_parameter_style(self):
        from docx import Document
        d=Document();table=d.add_table(rows=2,cols=4)
        for cell,label in zip(table.rows[0].cells,['PARAMETERS','SPECIFICATIONS','ACTUAL RESULTS','Remarks']):cell.text=label
        parameter=table.rows[1].cells[0];parameter.paragraphs[0].text='After 48 hrs. of incubation:';label=parameter.add_paragraph();label.add_run('Standard Plate Count (SPC)').bold=True
        table.rows[1].cells[1].text='Nmt 50 cfu/g';table.rows[1].cells[2].text='Historical result';table.rows[1].cells[3].text='Passed'
        source=self.folder/'historical-incubation.docx';output=self.folder/'prepared-incubation.docx';d.save(source)
        prepared=prepare_template(source.read_bytes(),output);self.assertEqual(prepared['instances'][0]['label'],'Standard Plate Count (SPC)')
        document=roots(package(output.read_bytes()))['word/document.xml'];cell=document.xpath('.//w:body/w:tbl/w:tr[2]/w:tc[1]',namespaces=NS)[0]
        self.assertNotIn('incubation',text(cell).lower());self.assertEqual(text(cell),'Standard Plate Count (SPC)')
        label_run=cell.xpath('.//w:r[w:t[contains(.,"Standard Plate Count")]]',namespaces=NS)[0]
        self.assertTrue(label_run.xpath('./w:rPr/w:b',namespaces=NS))
    def environmental_fixture(self,blocks=2):
        from docx import Document
        d=Document();header=d.sections[0].header
        for label,value in [('Name of Sample','Historical Product'),('Batch/Lot No.','OLD01'),('Logbook','Historical ML'),('Area','Filling'),('Temperature','25'),('Relative Humidity','60')]:
            header.add_paragraph(label);header.add_paragraph(':');header.add_paragraph(value)
        d.sections[0].footer.paragraphs[0].text='Historical Analyst'
        for test in ['Standard Plate Count (SPC)','Molds and Yeast'][:blocks]:
            t=d.add_table(rows=3,cols=5);t.style='Table Grid'
            for c,v in zip(t.rows[0].cells,['Analysis Desired','Area / Location','Standard Specifications','Actual Results','Remarks']):c.text=v
            for i in [1,2]:
                for c,v in zip(t.rows[i].cells,[test,'Nozzle '+str(i),'Nmt 100 cfu','Historical Result','Passed']):c.text=v
            t.cell(1,0).merge(t.cell(2,0)).text=test;t.cell(1,2).merge(t.cell(2,2)).text='Nmt 100 cfu'
        source=self.folder/'environmental.docx';d.save(source);return source
    def test_environmental_preparation_preserves_two_blocks_and_inherits_merged_criteria(self):
        source=self.environmental_fixture();out=self.folder/'prepared-env.docx';info=prepare_template(source.read_bytes(),out)
        self.assertEqual(set(info['blocks']),{'spc','my'})
        self.assertEqual(len(info['environmentalPattern']['blocks'][0]['instances']),2)
        self.assertEqual(info['environmentalPattern']['blocks'][0]['instances'][1]['criterion'],'Nmt 100 cfu')
        content=' '.join(text(r) for r in roots(package(out.read_bytes())).values())
        for historical in ['Historical Product','OLD01','Historical ML','Historical Analyst','Historical Result','Passed']:self.assertNotIn(historical,content)
        self.assertIn('rows.spc',content);self.assertIn('rows.my',content)
        self.assertNotIn('logbookReference',content)
        self.assertIn('sample.ml',validate_template(out.read_bytes())['tokens'])
    def test_preparation_clears_all_paragraphs_in_a_header_value_cell(self):
        from docx import Document
        d=Document(self.environmental_fixture());table=d.sections[0].header.add_table(rows=1,cols=3,width=d.sections[0].page_width)
        table.cell(0,0).text='Logbook';table.cell(0,1).text=':';table.cell(0,2).text='ML-EM-26-0001';table.cell(0,2).add_paragraph('ML-EM-26-0002')
        source=self.folder/'multi-ml.docx';d.save(source);output=self.folder/'multi-ml-prepared.docx';manifest=prepare_template(source.read_bytes(),output)
        content=' '.join(text(r) for r in roots(package(output.read_bytes())).values())
        self.assertNotIn('ML-EM-26-0001',content);self.assertNotIn('ML-EM-26-0002',content)
        self.assertFalse(any('Unmapped historical ML' in issue for issue in manifest['issues']))
    def test_two_blocks_render_independent_results_with_safe_vertical_merges(self):
        source=self.environmental_fixture();template=self.folder/'prepared-env.docx';info=prepare_template(source.read_bytes(),template)
        fields={k:'Current '+k for k in validate_template(template.read_bytes())['tokens'] if k not in ['test','location','criterion','value','remarks'] and not k.startswith('rows.')}
        rows=lambda test:[{'test':test,'location':'Nozzle '+str(i),'criterion':'Nmt 100 cfu','value':str(i-1)+' cfu','remarks':'','groupKey':test} for i in [1,2]]
        output=self.folder/'two-blocks.docx';render(template,{'fields':fields,'blocks':{'spc':rows('SPC'),'my':rows('MY')},'renderOptions':{'blocks':info['blocks']}},output)
        root=roots(package(output.read_bytes()))['word/document.xml']
        for table in root.xpath('./w:body/w:tbl',namespaces=NS):
            self.assertEqual(len(table.findall(W+'tr')),3)
            for col in [1,3]:self.assertEqual(len(table.xpath(f'./w:tr/w:tc[{col}]/w:tcPr/w:vMerge',namespaces=NS)),2)
            for col in [2,4,5]:self.assertEqual(len(table.xpath(f'./w:tr/w:tc[{col}]/w:tcPr/w:vMerge',namespaces=NS)),0)
        self.assertIn('0 cfu',text(root));self.assertNotIn('{{',text(root))
        with self.assertRaisesRegex(ValueError,'Only test and specification'):
            render(template,{'fields':fields,'blocks':{'spc':rows('SPC'),'my':rows('MY')},'renderOptions':{'blocks':{'spc':{'mergeColumns':[3]}}}},self.folder/'bad.docx')
    def test_missing_named_output_block_is_rejected(self):
        source=self.environmental_fixture();template=self.folder/'prepared-env.docx';prepare_template(source.read_bytes(),template)
        with self.assertRaisesRegex(ValueError,'Missing rows for block'):
            fields={k:'' for k in validate_template(template.read_bytes())['tokens'] if not k.startswith('rows.')}
            render(template,{'fields':fields,'blocks':{'spc':[{'test':'SPC','location':'Nozzle','criterion':'Nmt 100 cfu','value':'0','remarks':''}]}},self.folder/'missing.docx')
    def test_environmental_preparation_repairs_a_missing_footer_package(self):
        from docx import Document
        d=Document(self.environmental_fixture())
        for section in d.sections:
            for reference in list(section._sectPr.findall(W+'footerReference')):
                d.part.drop_rel(reference.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'));section._sectPr.remove(reference)
        source=self.folder/'without-footer.docx';d.save(source)
        output=self.folder/'footer-repaired.docx';prepare_template(source.read_bytes(),output)
        self.assertIn('sample.ml',validate_template(output.read_bytes())['tokens'])
        parts=package(output.read_bytes());self.assertTrue(any(n.startswith('word/footer') for n in parts))
        self.assertIn(b'/footer',parts['word/_rels/document.xml.rels'])
    def test_source_unmerged_rows_remain_unmerged(self):
        from docx import Document
        d=Document(self.environmental_fixture(blocks=1))
        for merge in d._element.xpath('.//w:vMerge'):merge.getparent().remove(merge)
        for row in d.tables[0].rows[1:]:row.cells[0].text='Standard Plate Count (SPC)';row.cells[2].text='Nmt 100 cfu'
        source=self.folder/'unmerged.docx';d.save(source);output=self.folder/'unmerged-prepared.docx'
        info=prepare_template(source.read_bytes(),output);self.assertEqual(info['blocks']['tests']['mergeColumns'],[])
if __name__=='__main__':unittest.main()
