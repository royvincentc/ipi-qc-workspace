import hashlib,importlib.util,unittest
from datetime import datetime
from pathlib import Path
spec=importlib.util.spec_from_file_location('baseline',Path(__file__).resolve().parents[1]/'scripts/build-environmental-baseline.py')
baseline=importlib.util.module_from_spec(spec);spec.loader.exec_module(baseline)
source_fields,reconcile,key=baseline.source_fields,baseline.reconcile,baseline.key

class BaselineTests(unittest.TestCase):
    def test_content_hash_and_october_through_december_batches(self):
        blob=b'actual file bytes';row=source_fields('PF- Environmental Monitoring/2026/Product/Filling/EXL01.docx',datetime(2026,10,7),'EXJ01 EXK01 EXL01',blob)
        self.assertEqual(row['archive_sha256'],hashlib.sha256(blob).hexdigest())
        self.assertEqual(row['batch_candidates'],'EXJ01 | EXK01 | EXL01')
        self.assertEqual(source_fields('PF- Environmental Monitoring/2026/Root.docx',datetime.now(),'Root',blob)['product'],'')
    def test_unapproved_alias_and_conflicting_header_ml_stay_in_review(self):
        event={'product':'Fixture Product','batch_candidates':'EXJ01','process_area':'Filling','method':'SPC/MY','header_ml_candidates':'ML-EM-26-0001'}
        row={'product':'Fixture Product Plus','batch':'EXJ01','area':'Filling','ml_number':'ML-EM-26-0001','accupoint_samplers':'','tab':'October 2026','sheet_row':5}
        self.assertEqual(reconcile([event],[row])[0]['match_status'],'review')
        approved={key('Fixture Product'):['Fixture Product Plus']}
        self.assertEqual(reconcile([event],[row],approved)[0]['match_status'],'matched')
        event['header_ml_candidates']='ML-EM-26-0002'
        self.assertEqual(reconcile([event],[row],approved)[0]['match_status'],'review')
if __name__=='__main__':unittest.main()
