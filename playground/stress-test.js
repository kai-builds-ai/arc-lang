const tests = [];

async function post(body, opts = {}) {
  const url = 'http://localhost:3000/api/run';
  const options = { method: 'POST', headers: {'Content-Type':'application/json'}, ...opts };
  if (body !== undefined && opts.body === undefined) options.body = typeof body === 'string' ? body : JSON.stringify(body);
  const start = Date.now();
  try {
    const r = await fetch(url, options);
    const text = await r.text();
    let json; try { json = JSON.parse(text); } catch { json = null; }
    return { status: r.status, json, text: text.slice(0,2000), ms: Date.now()-start };
  } catch(e) { return { error: e.message, ms: Date.now()-start }; }
}

async function run() {
  // 1. Normal execution
  let r = await post({code: 'print("hello")'});
  tests.push({name:'1. Normal execution', sent:'print("hello")', result:{status:r.status, json:r.json, ms:r.ms}});

  // 2. Infinite loop
  r = await post({code: 'while true { }'});
  tests.push({name:'2. Infinite loop', sent:'while true { }', result:{status:r.status, json:r.json, ms:r.ms}});

  // 3. Large output
  r = await post({code: 'let i = 0\nwhile i < 100000 {\n  print("line")\n  i = i + 1\n}'});
  tests.push({name:'3. Large output (100k prints)', sent:'print 100k lines', result:{status:r.status, outputLen:r.json?.output?.length, error:r.json?.error, ms:r.ms}});

  // 4. Syntax error
  r = await post({code: 'let x = = ='});
  tests.push({name:'4. Syntax error', sent:'let x = = =', result:{status:r.status, json:r.json, ms:r.ms}});

  // 5a. Empty string
  r = await post({code: ''});
  tests.push({name:'5a. Empty string', sent:'""', result:{status:r.status, json:r.json, ms:r.ms}});

  // 5b. null code
  r = await post({code: null});
  tests.push({name:'5b. Null code', sent:'null', result:{status:r.status, json:r.json, ms:r.ms}});

  // 5c. no code field
  r = await post({foo: 'bar'});
  tests.push({name:'5c. Missing code field', sent:'{foo:"bar"}', result:{status:r.status, json:r.json, ms:r.ms}});

  // 6. Huge input (1MB)
  r = await post({code: 'a'.repeat(1024*1024)});
  tests.push({name:'6. Huge input (1MB)', sent:'1MB of "a"', result:{status:r.status, error:r.json?.error, ms:r.ms}});

  // 7. Import attacks
  r = await post({code: 'use os\nos.exec("dir")'});
  tests.push({name:'7a. Import attack (use os)', sent:'use os; os.exec("dir")', result:{status:r.status, json:r.json, ms:r.ms}});

  r = await post({code: 'import("child_process")'});
  tests.push({name:'7b. Import attack (JS import)', sent:'import("child_process")', result:{status:r.status, json:r.json, ms:r.ms}});

  // 8. Resource exhaustion - deep nesting
  const deepCode = '('.repeat(200) + '1' + ')'.repeat(200);
  r = await post({code: deepCode});
  tests.push({name:'8a. Deep nesting (200 parens)', sent:'200 nested parens', result:{status:r.status, error:r.json?.error, ms:r.ms}});

  // 8b. Massive string concat
  r = await post({code: 'let s = "a"\nlet i = 0\nwhile i < 100000 {\n  s = s + "a"\n  i = i + 1\n}'});
  tests.push({name:'8b. Massive string concat', sent:'concat 100k times', result:{status:r.status, error:r.json?.error, ms:r.ms}});

  // 9. Concurrent - 20 simultaneous
  const concurrent = await Promise.all(Array.from({length:20}, () => post({code: 'print("hi")'})));
  const statuses = concurrent.map(c=>c.status);
  const errors = concurrent.filter(c=>c.error);
  tests.push({name:'9. 20 concurrent requests', sent:'20x print("hi")', result:{statuses, errorCount: errors.length, allOk: statuses.every(s=>s===200)}});

  // 10a. No body
  r = await post(undefined, {body: undefined});
  tests.push({name:'10a. POST no body', sent:'POST with empty body', result:{status:r.status, error:r.json?.error||r.error, ms:r.ms}});

  // 10b. Wrong content type
  r = await post(undefined, {body: 'code=hello', headers:{'Content-Type':'application/x-www-form-urlencoded'}});
  tests.push({name:'10b. Wrong content type', sent:'form-urlencoded body', result:{status:r.status, error:r.json?.error||r.error, ms:r.ms}});

  // 10c. GET instead of POST
  try {
    const gr = await fetch('http://localhost:3000/api/run');
    const gt = await gr.text();
    tests.push({name:'10c. GET request', sent:'GET /api/run', result:{status:gr.status, text:gt.slice(0,500)}});
  } catch(e) { tests.push({name:'10c. GET request', sent:'GET /api/run', result:{error:e.message}}); }

  console.log(JSON.stringify(tests, null, 2));
}
run().catch(e=>console.error(e));
