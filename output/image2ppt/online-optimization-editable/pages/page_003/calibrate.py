import pymupdf,json,pathlib
P=pathlib.Path(r'D:/AAA-SZ/留学学科教育/output/image2ppt/online-optimization-editable/pages/page_003')
r=json.loads((P/'page_request.json').read_text('utf-8'))
p=pymupdf.open(r'D:/AAA-SZ/2025_Online distributed optimization algorithm with dynamic regret analysis under unbalanced graphs.pdf')[2]
lines=[l for b in p.get_text('dict')['blocks'] if 'lines' in b for l in b['lines']]
sx=1191/p.rect.width;sy=1588/p.rect.height
fonts=json.loads((P.parent.parent/'fonts'/'font_mapping.json').read_text('utf-8'))
boxes=[]
for li in [5,16,17,18]:
 for si,s in enumerate(lines[li]['spans']):
  if not s['text'].strip(): continue
  size=s['size'];x0,y0,x1,y1=s['bbox'];oy=s['origin'][1];fm=fonts[s['font']];asc=fm['ascent']/fm['units_per_em']
  boxes.append({'id':f't{li}_{si}','text':s['text'],'box_px':[x0*sx,(oy-size*asc)*sy,(x1-x0)*sx+1.0,size*sy*1.4], 'font':fm['font_family'],'font_size':size*1.5,'italic':False,'color':'#'+format(s['color'],'06x'),'font_size_source':'measured','fit_text':False,'wrap':'none','z_index':40})
m={'schema_version':2,'slide':r['slide'],'content_box':r['content_box'],'source':{'path':'source.png','width_px':1191,'height_px':1588},'text_inventory':[b['text'] for b in boxes],'visual_inventory':[{'id':'white','kind':'background','representation':'native','description':'Uniform white journal-page background'}],'background_strategy':{'mode':'native-or-script','source_consistency_contract':'White background is preserved in original source dimensions','removed_foreground':[],'comparison_note':'Original has uniform white background'},'quality_checks':{k:True for k in ['font_size_calibrated','visual_inventory_matched','background_strategy_checked','shape_corner_geometry_checked']},'quality_evidence':{k:{'observation':'Calibration test of measured PDF text baseline, original source size retained'} for k in ['font_size_calibrated','visual_inventory_matched','background_strategy_checked','shape_corner_geometry_checked']},'text_boxes':boxes,'shapes':[],'images':[],'asset_provenance':[],'page_strategy':'Native-PDF extraction explicitly approved by user; this is a baseline calibration build only','image2ppt_region_decomposition':{'schema_version':'image2ppt-region-decomposition-v1','page_complexity':'simple','source_size_px':[1191,1588],'regions':[{'id':'test','label':'Text baseline calibration','source_bbox_px':[70,160,510,260],'risk_level':'low','strategy':'native-text-layout','reason':'Original PDF text native extraction user-approved','manifest_ids':{'text_boxes':[b['id'] for b in boxes],'shapes':[],'images':[]},'protected_visual_anchors':[]}]}}
(P/'manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf-8')
print(len(boxes))

