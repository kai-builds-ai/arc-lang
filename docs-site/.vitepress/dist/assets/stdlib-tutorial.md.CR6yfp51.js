import{_ as s,o as n,c as e,ag as p}from"./chunks/framework.DEqXEGcv.js";const h=JSON.parse('{"title":"Arc Standard Library Tutorial","description":"","frontmatter":{},"headers":[],"relativePath":"stdlib-tutorial.md","filePath":"stdlib-tutorial.md"}'),t={name:"stdlib-tutorial.md"};function l(i,a,o,r,c,u){return n(),e("div",null,[...a[0]||(a[0]=[p(`<h1 id="arc-standard-library-tutorial" tabindex="-1">Arc Standard Library Tutorial <a class="header-anchor" href="#arc-standard-library-tutorial" aria-label="Permalink to &quot;Arc Standard Library Tutorial&quot;">​</a></h1><p>A hands-on guide to using Arc&#39;s standard library for real-world tasks.</p><h2 id="prerequisites" tabindex="-1">Prerequisites <a class="header-anchor" href="#prerequisites" aria-label="Permalink to &quot;Prerequisites&quot;">​</a></h2><p>You should be familiar with Arc basics — see the <a href="/getting-started">Getting Started Guide</a> and <a href="/language-tour">Language Tour</a> first.</p><hr><h2 id="_1-working-with-collections" tabindex="-1">1. Working with Collections <a class="header-anchor" href="#_1-working-with-collections" aria-label="Permalink to &quot;1. Working with Collections&quot;">​</a></h2><p>Arc has powerful built-in list operations. No imports needed.</p><h3 id="map-filter-reduce" tabindex="-1">Map, Filter, Reduce <a class="header-anchor" href="#map-filter-reduce" aria-label="Permalink to &quot;Map, Filter, Reduce&quot;">​</a></h3><div class="language-arc vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">arc</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>let numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]</span></span>
<span class="line"><span></span></span>
<span class="line"><span># Square all numbers</span></span>
<span class="line"><span>let squares = numbers |&gt; map(n =&gt; n * n)</span></span>
<span class="line"><span># =&gt; [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]</span></span>
<span class="line"><span></span></span>
<span class="line"><span># Keep only evens</span></span>
<span class="line"><span>let evens = numbers |&gt; filter(n =&gt; n % 2 == 0)</span></span>
<span class="line"><span># =&gt; [2, 4, 6, 8, 10]</span></span>
<span class="line"><span></span></span>
<span class="line"><span># Sum everything</span></span>
<span class="line"><span>let total = numbers |&gt; reduce((acc, n) =&gt; acc + n, 0)</span></span>
<span class="line"><span># =&gt; 55</span></span></code></pre></div><h3 id="pipelines" tabindex="-1">Pipelines <a class="header-anchor" href="#pipelines" aria-label="Permalink to &quot;Pipelines&quot;">​</a></h3><p>Arc&#39;s <code>|&gt;</code> operator shines when chaining operations:</p><div class="language-arc vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">arc</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>let result = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]</span></span>
<span class="line"><span>  |&gt; filter(n =&gt; n % 2 == 0)    # keep evens</span></span>
<span class="line"><span>  |&gt; map(n =&gt; n * n)             # square them</span></span>
<span class="line"><span>  |&gt; take(3)                     # first 3</span></span>
<span class="line"><span>  |&gt; reduce((a, b) =&gt; a + b, 0) # sum</span></span>
<span class="line"><span># =&gt; 4 + 16 + 36 = 56</span></span></code></pre></div><h3 id="searching-and-slicing" tabindex="-1">Searching and Slicing <a class="header-anchor" href="#searching-and-slicing" aria-label="Permalink to &quot;Searching and Slicing&quot;">​</a></h3><div class="language-arc vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">arc</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>let fruits = [&quot;apple&quot;, &quot;banana&quot;, &quot;cherry&quot;, &quot;date&quot;]</span></span>
<span class="line"><span></span></span>
<span class="line"><span>fruits |&gt; find(f =&gt; f |&gt; len &gt; 5)   # =&gt; &quot;banana&quot;</span></span>
<span class="line"><span>fruits |&gt; contains(&quot;cherry&quot;)         # =&gt; true</span></span>
<span class="line"><span>fruits |&gt; take(2)                    # =&gt; [&quot;apple&quot;, &quot;banana&quot;]</span></span>
<span class="line"><span>fruits |&gt; skip(2)                    # =&gt; [&quot;cherry&quot;, &quot;date&quot;]</span></span>
<span class="line"><span>fruits |&gt; reverse                    # =&gt; [&quot;date&quot;, &quot;cherry&quot;, &quot;banana&quot;, &quot;apple&quot;]</span></span></code></pre></div><h3 id="working-with-maps" tabindex="-1">Working with Maps <a class="header-anchor" href="#working-with-maps" aria-label="Permalink to &quot;Working with Maps&quot;">​</a></h3><div class="language-arc vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">arc</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>let user = {name: &quot;Alice&quot;, age: 30, role: &quot;dev&quot;}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>keys(user)    # =&gt; [&quot;name&quot;, &quot;age&quot;, &quot;role&quot;]</span></span>
<span class="line"><span>values(user)  # =&gt; [&quot;Alice&quot;, 30, &quot;dev&quot;]</span></span>
<span class="line"><span></span></span>
<span class="line"><span># Access fields</span></span>
<span class="line"><span>user.name     # =&gt; &quot;Alice&quot;</span></span>
<span class="line"><span>user[&quot;age&quot;]   # =&gt; 30</span></span></code></pre></div><hr><h2 id="_2-string-manipulation" tabindex="-1">2. String Manipulation <a class="header-anchor" href="#_2-string-manipulation" aria-label="Permalink to &quot;2. String Manipulation&quot;">​</a></h2><p>Basic string operations are built-in. The <code>strings</code> module adds more.</p><h3 id="built-in-string-functions" tabindex="-1">Built-in String Functions <a class="header-anchor" href="#built-in-string-functions" aria-label="Permalink to &quot;Built-in String Functions&quot;">​</a></h3><div class="language-arc vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">arc</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>let s = &quot;  Hello, World!  &quot;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>trim(s)              # =&gt; &quot;Hello, World!&quot;</span></span>
<span class="line"><span>upper(&quot;hello&quot;)       # =&gt; &quot;HELLO&quot;</span></span>
<span class="line"><span>lower(&quot;HELLO&quot;)       # =&gt; &quot;hello&quot;</span></span>
<span class="line"><span>split(&quot;a,b,c&quot;, &quot;,&quot;) # =&gt; [&quot;a&quot;, &quot;b&quot;, &quot;c&quot;]</span></span>
<span class="line"><span>join([&quot;a&quot;,&quot;b&quot;], &quot;-&quot;) # =&gt; &quot;a-b&quot;</span></span>
<span class="line"><span>len(&quot;hello&quot;)         # =&gt; 5</span></span>
<span class="line"><span>slice(&quot;hello&quot;, 1, 3) # =&gt; &quot;el&quot;</span></span></code></pre></div><h3 id="string-interpolation" tabindex="-1">String Interpolation <a class="header-anchor" href="#string-interpolation" aria-label="Permalink to &quot;String Interpolation&quot;">​</a></h3><p>Arc uses <code>{}</code> inside strings for interpolation:</p><div class="language-arc vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">arc</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>let name = &quot;Arc&quot;</span></span>
<span class="line"><span>let version = 1</span></span>
<span class="line"><span>print(&quot;Welcome to {name} v{version}!&quot;)</span></span>
<span class="line"><span># =&gt; Welcome to Arc v1!</span></span></code></pre></div><h3 id="the-strings-module" tabindex="-1">The strings Module <a class="header-anchor" href="#the-strings-module" aria-label="Permalink to &quot;The strings Module&quot;">​</a></h3><div class="language-arc vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">arc</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>use strings</span></span>
<span class="line"><span></span></span>
<span class="line"><span>strings.pad_left(&quot;42&quot;, 5, &quot;0&quot;)     # =&gt; &quot;00042&quot;</span></span>
<span class="line"><span>strings.pad_right(&quot;hi&quot;, 10, &quot;.&quot;)   # =&gt; &quot;hi........&quot;</span></span>
<span class="line"><span>strings.capitalize(&quot;hello world&quot;)   # =&gt; &quot;Hello world&quot;</span></span>
<span class="line"><span>strings.words(&quot;  one  two  three &quot;) # =&gt; [&quot;one&quot;, &quot;two&quot;, &quot;three&quot;]</span></span></code></pre></div><h3 id="pipeline-friendly-string-processing" tabindex="-1">Pipeline-Friendly String Processing <a class="header-anchor" href="#pipeline-friendly-string-processing" aria-label="Permalink to &quot;Pipeline-Friendly String Processing&quot;">​</a></h3><div class="language-arc vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">arc</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>use strings</span></span>
<span class="line"><span></span></span>
<span class="line"><span>let title = &quot;  hello world  &quot;</span></span>
<span class="line"><span>  |&gt; trim</span></span>
<span class="line"><span>  |&gt; strings.capitalize</span></span>
<span class="line"><span># =&gt; &quot;Hello world&quot;</span></span>
<span class="line"><span></span></span>
<span class="line"><span># Process a list of names</span></span>
<span class="line"><span>let names = [&quot;alice&quot;, &quot;BOB&quot;, &quot;Charlie&quot;]</span></span>
<span class="line"><span>  |&gt; map(n =&gt; strings.capitalize(n))</span></span>
<span class="line"><span># =&gt; [&quot;Alice&quot;, &quot;Bob&quot;, &quot;Charlie&quot;]</span></span></code></pre></div><hr><h2 id="_3-http-api-calls" tabindex="-1">3. HTTP &amp; API Calls <a class="header-anchor" href="#_3-http-api-calls" aria-label="Permalink to &quot;3. HTTP &amp; API Calls&quot;">​</a></h2><p>Arc has first-class HTTP support with the <code>@</code> tool-call syntax.</p><h3 id="quick-requests" tabindex="-1">Quick Requests <a class="header-anchor" href="#quick-requests" aria-label="Permalink to &quot;Quick Requests&quot;">​</a></h3><div class="language-arc vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">arc</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># Simple GET — returns the response body</span></span>
<span class="line"><span>let data = @GET &quot;https://api.example.com/users&quot;</span></span>
<span class="line"><span></span></span>
<span class="line"><span># With headers</span></span>
<span class="line"><span>let data = @GET &quot;https://api.example.com/users&quot; {</span></span>
<span class="line"><span>  Authorization: &quot;Bearer {token}&quot;</span></span>
<span class="line"><span>}</span></span></code></pre></div><h3 id="post-with-body" tabindex="-1">POST with Body <a class="header-anchor" href="#post-with-body" aria-label="Permalink to &quot;POST with Body&quot;">​</a></h3><div class="language-arc vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">arc</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>let result = @POST &quot;https://api.example.com/users&quot; {</span></span>
<span class="line"><span>  name: &quot;Alice&quot;,</span></span>
<span class="line"><span>  email: &quot;alice@example.com&quot;</span></span>
<span class="line"><span>}</span></span></code></pre></div><h3 id="parallel-requests" tabindex="-1">Parallel Requests <a class="header-anchor" href="#parallel-requests" aria-label="Permalink to &quot;Parallel Requests&quot;">​</a></h3><div class="language-arc vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">arc</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># Fetch multiple APIs concurrently</span></span>
<span class="line"><span>let [weather, news] = fetch [</span></span>
<span class="line"><span>  @GET &quot;api/weather?city=NYC&quot;,</span></span>
<span class="line"><span>  @GET &quot;api/news/top?limit=5&quot;</span></span>
<span class="line"><span>]</span></span></code></pre></div><h3 id="processing-api-data" tabindex="-1">Processing API Data <a class="header-anchor" href="#processing-api-data" aria-label="Permalink to &quot;Processing API Data&quot;">​</a></h3><div class="language-arc vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">arc</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>let users = @GET &quot;https://api.example.com/users&quot;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>let names = users</span></span>
<span class="line"><span>  |&gt; filter(u =&gt; u.active)</span></span>
<span class="line"><span>  |&gt; map(u =&gt; u.name)</span></span>
<span class="line"><span>  |&gt; sort</span></span>
<span class="line"><span>  |&gt; join(&quot;, &quot;)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>print(&quot;Active users: {names}&quot;)</span></span></code></pre></div><hr><h2 id="_4-json-processing" tabindex="-1">4. JSON Processing <a class="header-anchor" href="#_4-json-processing" aria-label="Permalink to &quot;4. JSON Processing&quot;">​</a></h2><h3 id="parsing-and-stringifying-planned" tabindex="-1">Parsing and Stringifying (Planned) <a class="header-anchor" href="#parsing-and-stringifying-planned" aria-label="Permalink to &quot;Parsing and Stringifying (Planned)&quot;">​</a></h3><div class="language-arc vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">arc</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>use json</span></span>
<span class="line"><span></span></span>
<span class="line"><span># Parse a JSON string</span></span>
<span class="line"><span>let data = json.parse(&#39;{&quot;name&quot;: &quot;Alice&quot;, &quot;age&quot;: 30}&#39;)</span></span>
<span class="line"><span># =&gt; {name: &quot;Alice&quot;, age: 30}</span></span>
<span class="line"><span></span></span>
<span class="line"><span># Convert to JSON</span></span>
<span class="line"><span>let s = json.stringify({x: 1, y: [2, 3]})</span></span>
<span class="line"><span># =&gt; &#39;{&quot;x&quot;:1,&quot;y&quot;:[2,3]}&#39;</span></span>
<span class="line"><span></span></span>
<span class="line"><span># Pretty print</span></span>
<span class="line"><span>let pretty = json.pretty({name: &quot;Arc&quot;, version: 1})</span></span>
<span class="line"><span># =&gt; &#39;{</span></span>
<span class="line"><span>#   &quot;name&quot;: &quot;Arc&quot;,</span></span>
<span class="line"><span>#   &quot;version&quot;: 1</span></span>
<span class="line"><span># }&#39;</span></span></code></pre></div><h3 id="real-world-api-→-process-→-output" tabindex="-1">Real-World: API → Process → Output <a class="header-anchor" href="#real-world-api-→-process-→-output" aria-label="Permalink to &quot;Real-World: API → Process → Output&quot;">​</a></h3><div class="language-arc vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">arc</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>use json</span></span>
<span class="line"><span></span></span>
<span class="line"><span># Fetch API, transform, output as JSON</span></span>
<span class="line"><span>let result = @GET &quot;https://api.example.com/products&quot;</span></span>
<span class="line"><span>  |&gt; filter(p =&gt; p.price &lt; 50)</span></span>
<span class="line"><span>  |&gt; map(p =&gt; {name: p.name, price: p.price})</span></span>
<span class="line"><span>  |&gt; json.pretty</span></span>
<span class="line"><span></span></span>
<span class="line"><span>print(result)</span></span></code></pre></div><hr><h2 id="_5-testing-your-arc-code" tabindex="-1">5. Testing Your Arc Code <a class="header-anchor" href="#_5-testing-your-arc-code" aria-label="Permalink to &quot;5. Testing Your Arc Code&quot;">​</a></h2><h3 id="writing-tests-planned" tabindex="-1">Writing Tests (Planned) <a class="header-anchor" href="#writing-tests-planned" aria-label="Permalink to &quot;Writing Tests (Planned)&quot;">​</a></h3><div class="language-arc vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">arc</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>use test</span></span>
<span class="line"><span>use math</span></span>
<span class="line"><span></span></span>
<span class="line"><span>fn test_abs() {</span></span>
<span class="line"><span>  test.assert_eq(math.abs(-5), 5, &quot;abs of negative&quot;)</span></span>
<span class="line"><span>  test.assert_eq(math.abs(0), 0, &quot;abs of zero&quot;)</span></span>
<span class="line"><span>  test.assert_eq(math.abs(3), 3, &quot;abs of positive&quot;)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>fn test_sqrt() {</span></span>
<span class="line"><span>  test.assert_eq(math.sqrt(4), 2, &quot;sqrt of 4&quot;)</span></span>
<span class="line"><span>  test.assert_eq(math.sqrt(0), 0, &quot;sqrt of 0&quot;)</span></span>
<span class="line"><span>  test.assert_eq(math.sqrt(-1), nil, &quot;sqrt of negative&quot;)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>fn test_clamp() {</span></span>
<span class="line"><span>  test.assert_eq(math.clamp(15, 0, 10), 10, &quot;clamp above&quot;)</span></span>
<span class="line"><span>  test.assert_eq(math.clamp(-5, 0, 10), 0, &quot;clamp below&quot;)</span></span>
<span class="line"><span>  test.assert_eq(math.clamp(5, 0, 10), 5, &quot;clamp within&quot;)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>test.run([test_abs, test_sqrt, test_clamp])</span></span></code></pre></div><h3 id="testing-with-results" tabindex="-1">Testing with Results <a class="header-anchor" href="#testing-with-results" aria-label="Permalink to &quot;Testing with Results&quot;">​</a></h3><div class="language-arc vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">arc</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>use test</span></span>
<span class="line"><span>use result</span></span>
<span class="line"><span></span></span>
<span class="line"><span>fn test_result_ok() {</span></span>
<span class="line"><span>  let r = result.ok(42)</span></span>
<span class="line"><span>  test.assert_ok(r)</span></span>
<span class="line"><span>  test.assert_eq(result.unwrap(r), 42)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>fn test_result_err() {</span></span>
<span class="line"><span>  let r = result.err(&quot;oops&quot;)</span></span>
<span class="line"><span>  test.assert_err(r)</span></span>
<span class="line"><span>  test.assert_eq(result.unwrap_or(r, 0), 0)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>test.run([test_result_ok, test_result_err])</span></span></code></pre></div><hr><h2 id="_6-error-handling-with-result" tabindex="-1">6. Error Handling with Result <a class="header-anchor" href="#_6-error-handling-with-result" aria-label="Permalink to &quot;6. Error Handling with Result&quot;">​</a></h2><p>Arc uses the <code>Result</code> type for operations that can fail — no exceptions.</p><h3 id="the-basics-planned" tabindex="-1">The Basics (Planned) <a class="header-anchor" href="#the-basics-planned" aria-label="Permalink to &quot;The Basics (Planned)&quot;">​</a></h3><div class="language-arc vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">arc</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>use result</span></span>
<span class="line"><span></span></span>
<span class="line"><span># Create results</span></span>
<span class="line"><span>let good = result.ok(42)</span></span>
<span class="line"><span>let bad = result.err(&quot;file not found&quot;)</span></span>
<span class="line"><span></span></span>
<span class="line"><span># Check and extract</span></span>
<span class="line"><span>result.is_ok(good)          # =&gt; true</span></span>
<span class="line"><span>result.unwrap(good)         # =&gt; 42</span></span>
<span class="line"><span>result.unwrap_or(bad, 0)    # =&gt; 0</span></span></code></pre></div><h3 id="chaining-with-map-and-flat-map" tabindex="-1">Chaining with map and flat_map <a class="header-anchor" href="#chaining-with-map-and-flat-map" aria-label="Permalink to &quot;Chaining with map and flat_map&quot;">​</a></h3><div class="language-arc vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">arc</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>use result</span></span>
<span class="line"><span></span></span>
<span class="line"><span>fn parse_int(s) {</span></span>
<span class="line"><span>  # Returns Result&lt;Int&gt;</span></span>
<span class="line"><span>  match int(s) {</span></span>
<span class="line"><span>    nil =&gt; result.err(&quot;not a number: {s}&quot;),</span></span>
<span class="line"><span>    n   =&gt; result.ok(n)</span></span>
<span class="line"><span>  }</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>fn double(n) =&gt; result.ok(n * 2)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>let r = parse_int(&quot;21&quot;)</span></span>
<span class="line"><span>  |&gt; result.flat_map(double)</span></span>
<span class="line"><span># =&gt; Ok(42)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>let r2 = parse_int(&quot;abc&quot;)</span></span>
<span class="line"><span>  |&gt; result.flat_map(double)</span></span>
<span class="line"><span># =&gt; Err(&quot;not a number: abc&quot;)</span></span></code></pre></div><h3 id="pattern-matching-on-results" tabindex="-1">Pattern Matching on Results <a class="header-anchor" href="#pattern-matching-on-results" aria-label="Permalink to &quot;Pattern Matching on Results&quot;">​</a></h3><div class="language-arc vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">arc</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>let r = some_operation()</span></span>
<span class="line"><span></span></span>
<span class="line"><span>match r {</span></span>
<span class="line"><span>  Ok(value) =&gt; print(&quot;Got: {value}&quot;),</span></span>
<span class="line"><span>  Err(msg)  =&gt; print(&quot;Error: {msg}&quot;)</span></span>
<span class="line"><span>}</span></span></code></pre></div><hr><h2 id="_7-file-i-o" tabindex="-1">7. File I/O <a class="header-anchor" href="#_7-file-i-o" aria-label="Permalink to &quot;7. File I/O&quot;">​</a></h2><h3 id="reading-and-writing-files-planned" tabindex="-1">Reading and Writing Files (Planned) <a class="header-anchor" href="#reading-and-writing-files-planned" aria-label="Permalink to &quot;Reading and Writing Files (Planned)&quot;">​</a></h3><div class="language-arc vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">arc</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>use io</span></span>
<span class="line"><span></span></span>
<span class="line"><span># Read a file</span></span>
<span class="line"><span>let content = io.read_file(&quot;data.txt&quot;)</span></span>
<span class="line"><span>match content {</span></span>
<span class="line"><span>  Ok(text) =&gt; print(&quot;File has {len(text)} chars&quot;),</span></span>
<span class="line"><span>  Err(e)   =&gt; print(&quot;Error: {e}&quot;)</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span># Write a file</span></span>
<span class="line"><span>io.write_file(&quot;output.txt&quot;, &quot;Hello from Arc!&quot;)</span></span>
<span class="line"><span></span></span>
<span class="line"><span># Read lines and process</span></span>
<span class="line"><span>let lines = io.read_lines(&quot;data.csv&quot;)</span></span>
<span class="line"><span>  |&gt; result.unwrap_or([])</span></span>
<span class="line"><span>  |&gt; skip(1)                    # skip header</span></span>
<span class="line"><span>  |&gt; map(line =&gt; split(line, &quot;,&quot;))</span></span></code></pre></div><h3 id="pipeline-read-→-process-→-write" tabindex="-1">Pipeline: Read → Process → Write <a class="header-anchor" href="#pipeline-read-→-process-→-write" aria-label="Permalink to &quot;Pipeline: Read → Process → Write&quot;">​</a></h3><div class="language-arc vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">arc</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>use io</span></span>
<span class="line"><span>use strings</span></span>
<span class="line"><span></span></span>
<span class="line"><span>let result = io.read_file(&quot;names.txt&quot;)</span></span>
<span class="line"><span>  |&gt; result.map(text =&gt; {</span></span>
<span class="line"><span>    text</span></span>
<span class="line"><span>      |&gt; split(&quot;\\n&quot;)</span></span>
<span class="line"><span>      |&gt; map(n =&gt; strings.capitalize(trim(n)))</span></span>
<span class="line"><span>      |&gt; filter(n =&gt; len(n) &gt; 0)</span></span>
<span class="line"><span>      |&gt; sort</span></span>
<span class="line"><span>      |&gt; join(&quot;\\n&quot;)</span></span>
<span class="line"><span>  })</span></span>
<span class="line"><span></span></span>
<span class="line"><span>match result {</span></span>
<span class="line"><span>  Ok(sorted) =&gt; io.write_file(&quot;sorted-names.txt&quot;, sorted),</span></span>
<span class="line"><span>  Err(e)     =&gt; print(&quot;Failed: {e}&quot;)</span></span>
<span class="line"><span>}</span></span></code></pre></div><hr><h2 id="_8-math" tabindex="-1">8. Math <a class="header-anchor" href="#_8-math" aria-label="Permalink to &quot;8. Math&quot;">​</a></h2><div class="language-arc vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">arc</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>use math</span></span>
<span class="line"><span></span></span>
<span class="line"><span># Constants</span></span>
<span class="line"><span>print(&quot;π = {math.PI}&quot;)   # =&gt; π = 3.141592653589793</span></span>
<span class="line"><span>print(&quot;e = {math.E}&quot;)    # =&gt; e = 2.718281828459045</span></span>
<span class="line"><span></span></span>
<span class="line"><span># Circle area</span></span>
<span class="line"><span>fn circle_area(r) =&gt; math.PI * math.pow(r, 2)</span></span>
<span class="line"><span>print(circle_area(5))    # =&gt; 78.53981633974483</span></span>
<span class="line"><span></span></span>
<span class="line"><span># Clamping user input</span></span>
<span class="line"><span>let volume = math.clamp(user_input, 0, 100)</span></span>
<span class="line"><span></span></span>
<span class="line"><span># Safe sqrt</span></span>
<span class="line"><span>match math.sqrt(x) {</span></span>
<span class="line"><span>  nil =&gt; print(&quot;Cannot take sqrt of negative&quot;),</span></span>
<span class="line"><span>  val =&gt; print(&quot;√{x} = {val}&quot;)</span></span>
<span class="line"><span>}</span></span></code></pre></div><hr><h2 id="what-s-next" tabindex="-1">What&#39;s Next? <a class="header-anchor" href="#what-s-next" aria-label="Permalink to &quot;What&#39;s Next?&quot;">​</a></h2><ul><li>Check the <a href="/stdlib-reference">Standard Library Reference</a> for full API details</li><li>Browse <a href="https://github.com/kai-builds-ai/arc-lang/tree/main/examples" target="_blank" rel="noreferrer">examples</a> for complete programs</li><li>Read the <a href="/language-tour">Language Tour</a> for all language features</li><li>See the <a href="/faq">FAQ</a> for common questions</li></ul>`,72)])])}const g=s(t,[["render",l]]);export{h as __pageData,g as default};
