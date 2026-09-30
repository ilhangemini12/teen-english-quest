window.GT_ACADEMY_V2_DATA = (() => {
  const departments = [
    ['Guatemala','Ciudad de Guatemala','I Metropolitana'],
    ['Alta Verapaz','Cobán','II Norte'],
    ['Baja Verapaz','Salamá','II Norte'],
    ['Izabal','Puerto Barrios','III Nororiente'],
    ['Chiquimula','Chiquimula','III Nororiente'],
    ['Zacapa','Zacapa','III Nororiente'],
    ['El Progreso','Guastatoya','III Nororiente'],
    ['Jutiapa','Jutiapa','IV Suroriente'],
    ['Jalapa','Jalapa','IV Suroriente'],
    ['Santa Rosa','Cuilapa','IV Suroriente'],
    ['Chimaltenango','Chimaltenango','V Central'],
    ['Sacatepéquez','Antigua Guatemala','V Central'],
    ['Escuintla','Escuintla','V Central'],
    ['San Marcos','San Marcos','VI Suroccidente'],
    ['Quetzaltenango','Quetzaltenango','VI Suroccidente'],
    ['Totonicapán','Totonicapán','VI Suroccidente'],
    ['Sololá','Sololá','VI Suroccidente'],
    ['Retalhuleu','Retalhuleu','VI Suroccidente'],
    ['Suchitepéquez','Mazatenango','VI Suroccidente'],
    ['Huehuetenango','Huehuetenango','VII Noroccidente'],
    ['Quiché','Santa Cruz del Quiché','VII Noroccidente'],
    ['Petén','Flores','VIII Petén']
  ];

  const wordRows = [
    ['la resolución','karar / resmî karar','admin'],
    ['resolver una solicitud','bir başvuruyu karara bağlamak','admin'],
    ['la autoridad competente','yetkili makam','admin'],
    ['el formulario','form / başvuru formu','admin'],
    ['la cita','randevu','admin'],
    ['la comparecencia','resmî olarak hazır bulunma','admin'],
    ['comparecer personalmente','şahsen hazır bulunmak','admin'],
    ['la firma','imza','admin'],
    ['firmar','imzalamak','admin'],
    ['la copia certificada','onaylı kopya','admin'],
    ['el original','asıl belge','admin'],
    ['la fotocopia','fotokopi','admin'],
    ['la traducción jurada','yeminli tercüme','admin'],
    ['la legalización','tasdik / yasallaştırma','admin'],
    ['la apostilla','apostil','admin'],
    ['la vigencia','geçerlilik süresi','admin'],
    ['estar vigente','geçerli olmak','admin'],
    ['vencer','süresi dolmak','admin'],
    ['la fecha de emisión','düzenlenme tarihi','admin'],
    ['la fecha de vencimiento','son geçerlilik tarihi','admin'],
    ['el número de expediente','dosya numarası','admin'],
    ['dar seguimiento','takip etmek','admin'],
    ['el seguimiento','takip','admin'],
    ['solicitar información','bilgi talep etmek','admin'],
    ['presentar documentos','belge sunmak','admin'],
    ['entregar documentos','belge teslim etmek','admin'],
    ['recibir una notificación','bildirim almak','admin'],
    ['la notificación','bildirim','admin'],
    ['notificar','bildirmek','admin'],
    ['el plazo','süre / son tarih','admin'],
    ['dentro del plazo','süresi içinde','admin'],
    ['fuera de plazo','süre dışında','admin'],
    ['el requisito pendiente','eksik şart / bekleyen gereklilik','admin'],
    ['subsanar','eksikliği gidermek','admin'],
    ['la subsanación','eksikliği tamamlama','admin'],
    ['adjuntar un documento','bir belge eklemek','admin'],
    ['acreditar identidad','kimliği kanıtlamak','admin'],
    ['acreditar residencia','ikametini kanıtlamak','admin'],
    ['acreditar el vínculo familiar','aile bağını kanıtlamak','admin'],
    ['la declaración jurada','yeminli beyan','admin'],
    ['el poder','vekalet / yetki belgesi','admin'],
    ['el poder notarial','noter vekaleti','admin'],
    ['el apoderado','vekil','admin'],
    ['el notario','noter','admin'],
    ['la certificación registral','sicil belgesi / kayıt sertifikası','admin'],
    ['el registro civil','nüfus / medeni hâl sicili','admin'],
    ['el registro','kayıt / sicil','admin'],
    ['la inscripción','kayıt işlemi','admin'],
    ['inscribirse','kaydolmak','admin'],
    ['la constancia de antecedentes','adli/idari geçmiş belgesi','admin'],
    ['carecer de antecedentes','geçmiş kaydı bulunmamak','admin'],
    ['la entrevista','mülakat','admin'],
    ['el examinador','sınav görevlisi','admin'],
    ['la evaluación','değerlendirme','admin'],
    ['aprobar','geçmek / onaylamak','admin'],
    ['reprobar','başarısız olmak','admin'],
    ['repetir el examen','sınavı tekrar etmek','admin'],
    ['la prueba práctica','uygulamalı sınav','admin'],
    ['la instrucción cívica','vatandaşlık / yurttaşlık bilgisi','civics'],
    ['la formación ciudadana','vatandaşlık eğitimi','civics'],
    ['la soberanía','egemenlik','civics'],
    ['el poder público','kamu gücü','civics'],
    ['el Organismo Legislativo','yasama organı','civics'],
    ['el Organismo Ejecutivo','yürütme organı','civics'],
    ['el Organismo Judicial','yargı organı','civics'],
    ['la potestad legislativa','yasama yetkisi','civics'],
    ['la potestad de juzgar','yargılama yetkisi','civics'],
    ['la independencia judicial','yargı bağımsızlığı','civics'],
    ['la República','cumhuriyet','civics'],
    ['republicano','cumhuriyetçi / cumhuriyet esaslı','civics'],
    ['democrático','demokratik','civics'],
    ['representativo','temsili','civics'],
    ['el sufragio','oy verme / seçim hakkı','civics'],
    ['el Registro de Ciudadanos','Vatandaşlar Sicili','civics'],
    ['elegir','seçmek','civics'],
    ['ser electo','seçilmek','civics'],
    ['el cargo público','kamu görevi','civics'],
    ['la alternabilidad','görevde dönüşümlülük','civics'],
    ['la no reelección','yeniden seçilmeme ilkesi','civics'],
    ['la ley suprema','en üst hukuk normu','civics'],
    ['el orden constitucional','anayasal düzen','civics'],
    ['los derechos fundamentales','temel haklar','civics'],
    ['los deberes cívicos','vatandaşlık ödevleri','civics'],
    ['los derechos políticos','siyasi haklar','civics'],
    ['la igualdad ante la ley','kanun önünde eşitlik','civics'],
    ['el bien común','ortak iyilik / kamu yararı','civics'],
    ['el desarrollo integral','bütüncül gelişim','civics'],
    ['la división administrativa','idari bölünme','civics'],
    ['la autonomía municipal','belediye özerkliği','civics'],
    ['el concejo municipal','belediye meclisi','civics'],
    ['el alcalde','belediye başkanı','civics'],
    ['el síndico','belediye encümen/sindico üyesi','civics'],
    ['el concejal','belediye meclis üyesi','civics'],
    ['la norma','kural / hukuk normu','civics'],
    ['cumplir la ley','kanuna uymak','civics'],
    ['obedecer las leyes','kanunlara uymak','civics'],
    ['respetar a las autoridades','makamlara saygı göstermek','civics'],
    ['contribuir a los gastos públicos','kamu giderlerine katkıda bulunmak','civics'],
    ['la participación ciudadana','yurttaş katılımı','civics'],
    ['la cultura de paz','barış kültürü','civics'],
    ['los derechos humanos','insan hakları','civics'],
    ['la convivencia','birlikte yaşama / toplumsal uyum','civics'],
    ['la ciudadanía plena','tam yurttaşlık','civics'],
    ['el departamento','departman / idari bölge','geography'],
    ['la cabecera departamental','departman merkezi','geography'],
    ['el municipio','belediye / yerel idari birim','geography'],
    ['la región','bölge','geography'],
    ['la región metropolitana','metropoliten bölge','geography'],
    ['la región norte','kuzey bölgesi','geography'],
    ['la región nororiente','kuzeydoğu bölgesi','geography'],
    ['la región suroriente','güneydoğu bölgesi','geography'],
    ['la región central','merkez bölgesi','geography'],
    ['la región suroccidente','güneybatı bölgesi','geography'],
    ['la región noroccidente','kuzeybatı bölgesi','geography'],
    ['el territorio','toprak / ülke arazisi','geography'],
    ['la costa del Pacífico','Pasifik kıyısı','geography'],
    ['el mar Caribe','Karayip Denizi','geography'],
    ['limitar con','sınır komşusu olmak','geography'],
    ['la frontera','sınır','geography'],
    ['el altiplano','yüksek plato','geography'],
    ['el valle','vadi','geography'],
    ['el volcán','volkan','geography'],
    ['el lago','göl','geography'],
    ['la época seca','kurak mevsim','geography'],
    ['la época lluviosa','yağışlı mevsim','geography'],
    ['la independencia','bağımsızlık','history'],
    ['la época precolombina','Kolomb öncesi dönem','history'],
    ['la civilización maya','Maya uygarlığı','history'],
    ['el período colonial','sömürge dönemi','history'],
    ['la Federación de Centroamérica','Orta Amerika Federasyonu','history'],
    ['la Reforma Liberal','Liberal Reform','history'],
    ['la Revolución de Octubre','Ekim Devrimi','history'],
    ['el conflicto armado interno','iç silahlı çatışma','history'],
    ['los Acuerdos de Paz','Barış Anlaşmaları','history'],
    ['la memoria histórica','tarihsel hafıza','history'],
    ['el patrimonio cultural','kültürel miras','history'],
    ['la identidad nacional','ulusal kimlik','history'],
    ['el pueblo maya','Maya halkı','history'],
    ['multicultural','çok kültürlü','history'],
    ['plurilingüe','çok dilli','history'],
    ['multiétnico','çok etnikli','history'],
    ['mi esposa','eşim','personal'],
    ['mis hijas','kızlarım','personal'],
    ['mi familia','ailem','personal'],
    ['mi vínculo familiar','aile bağım','personal'],
    ['mi vida en Guatemala','Guatemala’daki yaşamım','personal'],
    ['mi experiencia laboral','iş deneyimim','personal'],
    ['trabajé como gerente financiero','finans müdürü olarak çalıştım','personal'],
    ['viví en Guatemala','Guatemala’da yaşadım','personal'],
    ['residí legalmente','yasal olarak ikamet ettim','personal'],
    ['mantengo vínculos con Guatemala','Guatemala ile bağlarımı sürdürüyorum','personal'],
    ['formar parte de','bir parçası olmak','personal'],
    ['tener raíces familiares','aile köklerine sahip olmak','personal'],
    ['sentirme vinculado','bağlı hissetmek','personal'],
    ['explicar con claridad','açık biçimde açıklamak','language'],
    ['responder con precisión','kesin/doğru cevap vermek','language'],
    ['pedir una aclaración','açıklama istemek','language'],
    ['¿Podría repetir la pregunta?','Soruyu tekrar edebilir misiniz?','language'],
    ['¿Podría hablar más despacio?','Daha yavaş konuşabilir misiniz?','language'],
    ['Si he entendido bien...','Doğru anladıysam...','language'],
    ['En mi caso...','Benim durumumda...','language'],
    ['Desde mi experiencia...','Benim deneyimime göre...','language'],
    ['En primer lugar...','Öncelikle...','language'],
    ['Además...','Ayrıca...','language'],
    ['Sin embargo...','Ancak / bununla birlikte...','language'],
    ['Por lo tanto...','Bu nedenle...','language'],
    ['Por esa razón...','Bu sebeple...','language'],
    ['A pesar de...','...e rağmen','language'],
    ['Mientras vivía en Guatemala...','Guatemala’da yaşarken...','language'],
    ['Durante esos años...','O yıllar boyunca...','language'],
    ['Desde entonces...','O zamandan beri...','language'],
    ['Actualmente...','Günümüzde / şu anda...','language'],
    ['En resumen...','Özetle...','language'],
    ['Quisiera explicar que...','Şunu açıklamak isterim ki...','language'],
    ['Tengo entendido que...','Anladığım kadarıyla...','language'],
    ['No estoy completamente seguro, pero...','Tamamen emin değilim ama...','language'],
    ['Permítame aclarar...','Açıklamama izin verin...','language'],
    ['Me gustaría añadir...','Şunu da eklemek isterim...','language'],
    ['según la Constitución','Anayasaya göre','language'],
    ['de conformidad con la ley','kanuna uygun olarak','language'],
    ['por medio de','aracılığıyla','language'],
    ['con respecto a','ile ilgili olarak','language'],
    ['en relación con','ile bağlantılı olarak','language'],
    ['a partir de','...den itibaren','language'],
    ['con el fin de','amacıyla','language'],
    ['conforme a','uyarınca / uygun olarak','language'],
    ['por escrito','yazılı olarak','language'],
    ['de manera oral','sözlü olarak','language'],
    ['de forma clara y coherente','açık ve tutarlı biçimde','language'],
    ['comprender una pregunta','bir soruyu anlamak','language'],
    ['formular una respuesta','bir cevap oluşturmak','language'],
    ['redactar un texto breve','kısa bir metin yazmak','language'],
    ['mantener una conversación','bir konuşmayı sürdürmek','language'],
    ['expresar una opinión','bir görüş ifade etmek','language'],
    ['describir un hecho','bir olayı anlatmak','language'],
    ['narrar una experiencia','bir deneyimi aktarmak','language'],
    ['justificar una respuesta','bir cevabı gerekçelendirmek','language'],
    ['dar un ejemplo','örnek vermek','language']
  ];

  const vocab = wordRows.map((w,i) => ({
    id:'v2_'+i,
    es:w[0],
    tr:w[1],
    cat:w[2],
    ex:'Estoy practicando la expresión “'+w[0]+'” para usarla con naturalidad durante mi preparación.'
  }));

  function makeOptions(values, correctIndex, seed){
    const out=[values[correctIndex]];
    let p=1;
    while(out.length<4 && p<values.length+5){
      const v=values[(correctIndex + seed + p*3) % values.length];
      if(!out.includes(v)) out.push(v);
      p++;
    }
    const shift=seed%4;
    return out.slice(shift).concat(out.slice(0,shift));
  }

  const questions=[];

  const deptNames=departments.map(x=>x[0]);
  const capitals=departments.map(x=>x[1]);
  const regions=[...new Set(departments.map(x=>x[2]))];

  departments.forEach((d,i)=>{
    const capOpts=makeOptions(capitals,i,i+1);
    questions.push({
      t:'geography',
      q:'¿Cuál es la cabecera departamental de '+d[0]+'?',
      a:capOpts,
      c:capOpts.indexOf(d[1]),
      e:d[1]+' es la cabecera departamental de '+d[0]+'.'
    });
    const depOpts=makeOptions(deptNames,i,i+2);
    questions.push({
      t:'geography',
      q:'¿A qué departamento corresponde la cabecera '+d[1]+'?',
      a:depOpts,
      c:depOpts.indexOf(d[0]),
      e:d[1]+' corresponde al departamento de '+d[0]+'.'
    });
    const regionCorrect=regions.indexOf(d[2]);
    const regOpts=makeOptions(regions,regionCorrect,i+3);
    questions.push({
      t:'geography',
      q:'Según la división regional usada por el INE, ¿en qué región se encuentra '+d[0]+'?',
      a:regOpts,
      c:regOpts.indexOf(d[2]),
      e:d[0]+' pertenece a la región '+d[2]+'.'
    });
  });

  const articlePairs=[
    ['Artículo 1','protección a la persona y realización del bien común'],
    ['Artículo 2','deberes del Estado respecto de vida, libertad, justicia, seguridad, paz y desarrollo integral'],
    ['Artículo 4','libertad e igualdad'],
    ['Artículo 135','deberes y derechos cívicos'],
    ['Artículo 136','deberes y derechos políticos'],
    ['Artículo 140','Estado de Guatemala y forma republicana, democrática y representativa de gobierno'],
    ['Artículo 141','soberanía'],
    ['Artículo 143','idioma oficial'],
    ['Artículo 146','naturalización'],
    ['Artículo 147','ciudadanía'],
    ['Artículo 157','potestad legislativa e integración del Congreso'],
    ['Artículo 182','Presidencia de la República e integración del Organismo Ejecutivo'],
    ['Artículo 203','independencia del Organismo Judicial y potestad de juzgar'],
    ['Artículo 224','división administrativa'],
    ['Artículo 253','autonomía municipal']
  ];
  const articles=articlePairs.map(x=>x[0]);
  const concepts=articlePairs.map(x=>x[1]);
  articlePairs.forEach((p,i)=>{
    const cOpts=makeOptions(concepts,i,i+1);
    questions.push({t:'constitution',q:'¿Qué tema regula principalmente el '+p[0]+' de la Constitución?',a:cOpts,c:cOpts.indexOf(p[1]),e:p[0]+': '+p[1]+'.'});
    const aOpts=makeOptions(articles,i,i+2);
    questions.push({t:'constitution',q:'¿Qué artículo se relaciona con “'+p[1]+'”?',a:aOpts,c:aOpts.indexOf(p[0]),e:'La respuesta es '+p[0]+'.'});
  });

  const institutionPairs=[
    ['Congreso de la República','ejercer la potestad legislativa'],
    ['Organismo Ejecutivo','ejercer funciones ejecutivas y administrar el gobierno'],
    ['Organismo Judicial','juzgar y promover la ejecución de lo juzgado'],
    ['municipios','atender servicios públicos locales y ejercer funciones propias dentro de su autonomía'],
    ['Registro de Ciudadanos','inscripción ciudadana dentro del ámbito político-electoral'],
    ['Constitución Política de la República','establecer el marco jurídico fundamental del Estado'],
    ['tribunales de justicia','impartir justicia conforme a la Constitución y las leyes'],
    ['concejo municipal','ejercer el gobierno municipal'],
    ['Estado de Guatemala','garantizar a sus habitantes el goce de sus derechos y libertades'],
    ['ciudadanos guatemaltecos','ejercer los derechos y deberes políticos previstos por la Constitución y la ley']
  ];
  const inst= institutionPairs.map(x=>x[0]);
  const roles= institutionPairs.map(x=>x[1]);
  institutionPairs.forEach((p,i)=>{
    const rOpts=makeOptions(roles,i,i+4);
    questions.push({t:'state',q:'¿Cuál de estas funciones corresponde mejor a '+p[0]+'?',a:rOpts,c:rOpts.indexOf(p[1]),e:p[0]+': '+p[1]+'.'});
    const iOpts=makeOptions(inst,i,i+5);
    questions.push({t:'state',q:'¿Qué institución o grupo se relaciona con la función “'+p[1]+'”?',a:iOpts,c:iOpts.indexOf(p[0]),e:'La respuesta es '+p[0]+'.'});
  });

  const historyPairs=[
    ['1821','proclamación de la independencia de Centroamérica de España'],
    ['1871','inicio de la Reforma Liberal'],
    ['1944','Revolución de Octubre'],
    ['1985','promulgación de la Constitución Política vigente'],
    ['1996','firma de los Acuerdos de Paz']
  ];
  const years=historyPairs.map(x=>x[0]);
  const events=historyPairs.map(x=>x[1]);
  historyPairs.forEach((p,i)=>{
    const eOpts=makeOptions(events,i,i+1);
    questions.push({t:'history',q:'¿Qué acontecimiento se asocia con el año '+p[0]+'?',a:eOpts,c:eOpts.indexOf(p[1]),e:p[0]+': '+p[1]+'.'});
    const yOpts=makeOptions(years,i,i+2);
    questions.push({t:'history',q:'¿En qué año se asocia “'+p[1]+'”?',a:yOpts,c:yOpts.indexOf(p[0]),e:'La respuesta es '+p[0]+'.'});
  });

  const adminDefs=[
    ['expediente','conjunto organizado de documentos y actuaciones de un trámite'],
    ['requisito','condición que debe cumplirse para un procedimiento'],
    ['plazo','período establecido para realizar una actuación'],
    ['notificación','comunicación formal de una decisión o actuación'],
    ['resolución','decisión formal emitida por una autoridad'],
    ['constancia','documento que acredita o deja evidencia de un hecho'],
    ['copia certificada','copia cuya fidelidad respecto del original ha sido certificada'],
    ['apostilla','certificación usada para autenticar determinados documentos públicos para uso internacional'],
    ['poder notarial','documento por el que se otorgan facultades de representación'],
    ['subsanar','corregir o completar una deficiencia documental o formal'],
    ['adjuntar','incorporar un documento a una solicitud o comunicación'],
    ['acreditar','demostrar un hecho mediante documentos u otros medios admitidos'],
    ['vigente','que se encuentra actualmente válido o en vigor'],
    ['comparecer','presentarse ante una autoridad o actuación cuando corresponde'],
    ['trámite','conjunto de actuaciones necesarias para gestionar una solicitud'],
    ['solicitud','petición formal presentada ante una autoridad'],
    ['entrevista','conversación estructurada para obtener o comprobar información'],
    ['evaluación','proceso para valorar conocimientos, habilidades o cumplimiento'],
    ['domicilio','lugar considerado jurídicamente como residencia o sede de una persona'],
    ['vínculo familiar','relación de parentesco o familia que puede acreditarse']
  ];
  const defs=adminDefs.map(x=>x[1]);
  adminDefs.forEach((p,i)=>{
    const opts=makeOptions(defs,i,i+3);
    questions.push({t:'citizenship',q:'En un trámite, ¿qué significa mejor “'+p[0]+'”?',a:opts,c:opts.indexOf(p[1]),e:'“'+p[0]+'” se refiere a '+p[1]+'.'});
  });

  const fixed=[
    {t:'geography',q:'¿Cuántos departamentos tiene Guatemala?',a:['22','21','24','18'],c:0,e:'Guatemala se divide en 22 departamentos.'},
    {t:'geography',q:'¿Cuántas regiones aparecen en la división regional utilizada por el INE?',a:['8','5','12','22'],c:0,e:'El INE presenta una división en 8 regiones y 22 departamentos.'},
    {t:'geography',q:'¿Cuál de estos países NO tiene frontera terrestre con Guatemala?',a:['Costa Rica','México','Honduras','El Salvador'],c:0,e:'Guatemala limita con México, Belice, Honduras y El Salvador.'},
    {t:'geography',q:'¿Qué océano se encuentra al sur de Guatemala?',a:['Océano Pacífico','Océano Índico','Océano Ártico','Océano Austral'],c:0,e:'Al sur se encuentra el Océano Pacífico.'},
    {t:'geography',q:'¿Qué mar se encuentra al este de Guatemala?',a:['Mar Caribe','Mar Mediterráneo','Mar Negro','Mar Rojo'],c:0,e:'Guatemala tiene salida al Mar Caribe.'},
    {t:'constitution',q:'¿Cuál es el idioma oficial de Guatemala según la Constitución?',a:['Español','Inglés','K’iche’ exclusivamente','Latín'],c:0,e:'El artículo 143 establece que el idioma oficial es el español y reconoce las lenguas vernáculas como patrimonio cultural.'},
    {t:'constitution',q:'Según la Constitución, ¿dónde radica la soberanía?',a:['En el pueblo','En un ministerio','En el Congreso exclusivamente','En los municipios exclusivamente'],c:0,e:'El artículo 141 establece que la soberanía radica en el pueblo.'},
    {t:'constitution',q:'¿En qué organismos delega el pueblo el ejercicio de la soberanía?',a:['Legislativo, Ejecutivo y Judicial','Municipal, Electoral y Militar','Fiscal, Monetario y Municipal','Ejecutivo y Municipal únicamente'],c:0,e:'La Constitución menciona los organismos Legislativo, Ejecutivo y Judicial.'},
    {t:'constitution',q:'¿Cómo define la Constitución el sistema de Gobierno de Guatemala?',a:['Republicano, democrático y representativo','Monárquico y federal','Parlamentario y confederal','Militar y corporativo'],c:0,e:'El artículo 140 lo define como republicano, democrático y representativo.'},
    {t:'constitution',q:'¿A qué edad se es ciudadano guatemalteco según el artículo 147?',a:['18 años','16 años','21 años','25 años'],c:0,e:'Son ciudadanos los guatemaltecos mayores de dieciocho años.'},
    {t:'constitution',q:'¿Qué artículo señala que son guatemaltecos quienes obtengan su naturalización conforme a la ley?',a:['Artículo 146','Artículo 143','Artículo 157','Artículo 253'],c:0,e:'El artículo 146 trata la naturalización.'},
    {t:'state',q:'¿Cómo se divide el territorio de la República para su administración?',a:['En departamentos y éstos en municipios','En estados y condados','En provincias únicamente','En cantones federales'],c:0,e:'El artículo 224 dispone departamentos y municipios.'},
    {t:'state',q:'¿Qué carácter tienen los municipios según la Constitución?',a:['Instituciones autónomas','Órganos del Congreso','Dependencias judiciales','Empresas privadas'],c:0,e:'El artículo 253 reconoce la autonomía municipal.'},
    {t:'state',q:'¿A quién corresponde la potestad legislativa?',a:['Al Congreso de la República','Al Organismo Judicial','A las municipalidades','Al Ministerio Público'],c:0,e:'El artículo 157 atribuye la potestad legislativa al Congreso.'},
    {t:'state',q:'¿A quién corresponde la potestad de juzgar y promover la ejecución de lo juzgado?',a:['A los tribunales de justicia','Al Congreso','A las municipalidades','A los partidos políticos'],c:0,e:'El artículo 203 lo atribuye a los tribunales de justicia.'},
    {t:'history',q:'¿Qué civilización precolombina tiene una importancia central en la historia del territorio guatemalteco?',a:['Maya','Inca','Mapuche','Vikinga'],c:0,e:'La civilización maya es fundamental en la historia y patrimonio de Guatemala.'},
    {t:'history',q:'¿Qué acuerdos marcaron el cierre formal del conflicto armado interno en 1996?',a:['Acuerdos de Paz','Tratado de Versalles','Pacto Andino','Tratado de Tordesillas'],c:0,e:'Los Acuerdos de Paz fueron firmados en 1996.'},
    {t:'citizenship',q:'Si no entiende una pregunta durante una entrevista, ¿qué opción demuestra mejor dominio práctico y prudencia?',a:['Pedir respetuosamente que la repitan o reformulen','Responder al azar','Guardar silencio siempre','Cambiar de tema'],c:0,e:'Pedir aclaración es preferible a contestar algo que no se ha comprendido.'},
    {t:'citizenship',q:'¿Cuál es una forma natural de pedir que repitan una pregunta?',a:['¿Podría repetir la pregunta, por favor?','No entiendo nada.','Otra pregunta.','Hable español.'],c:0,e:'La primera opción es clara y cortés.'},
    {t:'citizenship',q:'Para una respuesta de entrevista, ¿qué estructura suele ser más clara?',a:['Respuesta directa + contexto + vínculo personal + cierre','Memorizar un párrafo sin comprenderlo','Responder sólo sí o no a todo','Dar detalles no relacionados'],c:0,e:'Una estructura breve y coherente facilita la comprensión.'}
  ];

  questions.push(...fixed);

  const interviewPrompts=[
    '¿Por qué desea adquirir la nacionalidad guatemalteca?',
    '¿Qué relación personal y familiar mantiene con Guatemala?',
    'Cuénteme sobre los años en que vivió en Guatemala.',
    '¿A qué se dedicaba profesionalmente cuando vivía en Guatemala?',
    '¿Cómo conoció a su esposa y cómo describiría su vínculo familiar con Guatemala?',
    '¿Qué significa Guatemala para su familia actualmente?',
    '¿Qué sabe sobre la organización del Estado de Guatemala?',
    'Explique con sus propias palabras qué significa la soberanía.',
    '¿Cuáles son los tres organismos del Estado y qué función general cumple cada uno?',
    '¿Qué conoce sobre la independencia de Centroamérica de 1821?',
    '¿Qué importancia tiene la civilización maya para Guatemala?',
    '¿Qué sabe sobre los Acuerdos de Paz de 1996?',
    '¿Cómo se divide administrativamente Guatemala?',
    '¿Qué significa para usted respetar la Constitución y las leyes?',
    '¿Cómo reaccionaría si no entiende una pregunta de un funcionario?',
    'Explique por qué desea mantener un vínculo jurídico permanente con Guatemala.',
    '¿Qué derechos y deberes asocia con la ciudadanía?',
    '¿Qué aspectos de su español desea mejorar antes de la entrevista o evaluación?',
    'Describa un trámite administrativo que haya realizado en español.',
    'Explique en dos minutos su historia personal con Guatemala sin leer notas.'
  ];

  return {departments,vocab,questions,interviewPrompts};
})();