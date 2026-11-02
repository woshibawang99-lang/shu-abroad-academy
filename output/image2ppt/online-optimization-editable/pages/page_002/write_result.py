import pathlib,json
p=pathlib.Path(r'D:/AAA-SZ/留学学科教育/output/image2ppt/online-optimization-editable/pages/page_002');r={'page_manifest':'manifest.json','imagegen_jobs':'imagegen-jobs.json','page_pptx':'page.pptx','preview':'preview.png','contact_sheet':'split_assets_contact.png','validation':'validation.json','page_result':'page_result.json'}
(p/'page_result.json').write_text(json.dumps(r,indent=2),encoding='utf-8')
v=json.loads((p/'validation.json').read_text(encoding='utf-8'));q=json.loads((p/'image2ppt_qa.json').read_text(encoding='utf-8'));print('standard_passed',v['passed'],'profile_passed',v['image2ppt_profile']['passed'],'QA',q['passed']); print('All result files exist',all((p/x).exists() for x in r.values()))
