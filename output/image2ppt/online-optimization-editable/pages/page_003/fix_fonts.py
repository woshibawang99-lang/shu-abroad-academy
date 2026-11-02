from pathlib import Path
from fontTools.ttLib import TTFont
import json
P=Path(__file__).resolve().parent
source_mapping=P.parent.parent/'fonts/font_mapping.json'
outdir=P/'fonts-fixed';outdir.mkdir(exist_ok=True)
mapping=json.loads(source_mapping.read_text('utf-8'))
for key,entry in mapping.items():
 f=TTFont(entry['path'])
 family=entry['font_family'].replace('PDFR_','PDFRT_')
 n=f['name']
 for platform,encoding,lang in [(3,1,0x409),(1,0,0)]:
  for i,value in [(1,family),(2,'Regular'),(3,family+' Regular 1.001'),(4,family),(5,'Version 1.001'),(6,family),(16,family),(17,'Regular')]:
   n.setName(value,i,platform,encoding,lang)
 o=f['OS/2'];o.fsSelection=64;o.sFamilyClass=0x0100;o.ulCodePageRange1=1;o.ulCodePageRange2=0;o.achVendID='PDFR';o.sxHeight=500;o.sCapHeight=735
 o.ySubscriptXSize=650;o.ySubscriptYSize=600;o.ySubscriptYOffset=75;o.ySuperscriptXSize=650;o.ySuperscriptYSize=600;o.ySuperscriptYOffset=350
 o.panose.bFamilyType=2;o.panose.bSerifStyle=2;o.panose.bWeight=5;o.panose.bProportion=2;o.panose.bContrast=5;o.panose.bStrokeVariation=2;o.panose.bArmStyle=2;o.panose.bLetterForm=2;o.panose.bMidline=2;o.panose.bXHeight=4
 o.recalcUnicodeRanges(f)
 f['head'].flags=3;f['head'].macStyle=0;f['post'].underlinePosition=-100;f['post'].underlineThickness=50
 out=outdir/(family+'.ttf');f.save(out)
 entry['original_family']=entry['font_family'];entry['family']=family;entry['font_family']=family;entry['path']=str(out)
 entry['metadata_fix']='Windows Office-compatible Regular style, typographic names16/17, Latin codepage, serif PANOSE. Actual source outlines preserved including bold/italic faces as independent regular families.'
 entry['note']=entry.get('note','')+' Metadata-fixed replacement font; source glyph outlines and cmap unchanged.'
 print(key,family)
(outdir/'font_mapping_fixed.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2),encoding='utf-8')
print('Mapping',outdir/'font_mapping_fixed.json')
