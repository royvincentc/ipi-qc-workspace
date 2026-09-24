import io,json,tempfile,unittest,zipfile
from pathlib import Path
from docx_worker import demo_template,render,inventory,validate_template,prepare_template,package,roots,text,NS,W

class DocumentTests(unittest.TestCase):
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
if __name__=='__main__':unittest.main()
