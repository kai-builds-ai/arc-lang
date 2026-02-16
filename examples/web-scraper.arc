# ============================================================================
# Web Scraper in Arc
# ============================================================================
# A parallel web scraper that fetches pages, extracts structured data using
# regex, transforms with pipelines, and outputs JSON. Demonstrates: async/await,
# parallel fetch, regex, pipelines, closures, pattern matching, collections.
# ============================================================================

use http
use regex
use json
use collections
use datetime

# --- Configuration ---

pub fn scraper_config(base_url, options) => {
    let defaults = {
        max_concurrent: 5,
        timeout_ms: 10000,
        retry_count: 3,
        delay_ms: 100,
        user_agent: "ArcScraper/1.0",
        headers: {}
    }
    collections.merge(defaults, options, { base_url: base_url })
}

# --- URL Builder ---

pub fn build_urls(base_url, pattern, range) => {
    range |> collections.map(fn(i) => {
        pattern
        |> regex.replace(r"\{page\}", "${i}")
        |> fn(path) => "${base_url}${path}"
    })
}

# --- HTTP Fetching ---

async fn fetch_page(url, config) => {
    let headers = collections.merge(config.headers, {
        "User-Agent": config.user_agent
    })
    
    let mut attempts = 0
    let mut last_error = nil
    
    loop {
        match attempts >= config.retry_count {
            true => ret { error: last_error, url: url },
            false => {
                attempts = attempts + 1
                let result = await http.get(url, {
                    headers: headers,
                    timeout: config.timeout_ms
                })
                match result {
                    { status: 200, body: body } => ret { ok: body, url: url },
                    { status: 429 } => {
                        await http.sleep(config.delay_ms * attempts * 2)
                        last_error = "Rate limited"
                    },
                    { status: s } => {
                        last_error = "HTTP ${s}"
                    },
                    { error: e } => {
                        last_error = e
                    }
                }
            }
        }
    }
}

pub async fn fetch_all(urls, config) => {
    urls
    |> collections.chunks(config.max_concurrent)
    |> collections.flat_map(async fn(chunk) => {
        let results = await parallel chunk |> collections.map(fn(url) => fetch_page(url, config))
        await http.sleep(config.delay_ms)
        results
    })
}

# --- Extraction Rules ---

pub fn extractor(name, pattern, transform) => {
    { name: name, pattern: regex.compile(pattern), transform: transform }
}

pub fn extract(html, extractors) => {
    extractors |> collections.reduce({}, fn(data, ext) => {
        let matches = regex.find_all(ext.pattern, html)
        let values = matches |> collections.map(ext.transform)
        collections.set(data, ext.name, values)
    })
}

# --- Common Extractors ---

pub fn title_extractor() => extractor(
    "titles",
    r"<h[1-3][^>]*>(.*?)</h[1-3]>",
    fn(m) => m[1] |> strip_tags() |> trim()
)

pub fn link_extractor() => extractor(
    "links",
    r#"<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)</a>"#,
    fn(m) => { url: m[1], text: m[2] |> strip_tags() |> trim() }
)

pub fn image_extractor() => extractor(
    "images",
    r#"<img\s+[^>]*src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?"#,
    fn(m) => { src: m[1], alt: m[2] or "" }
)

pub fn meta_extractor() => extractor(
    "meta",
    r#"<meta\s+(?:name|property)=["']([^"']+)["']\s+content=["']([^"']+)["']"#,
    fn(m) => { name: m[1], content: m[2] }
)

pub fn table_row_extractor() => extractor(
    "rows",
    r"<tr[^>]*>(.*?)</tr>",
    fn(m) => {
        regex.find_all(r"<t[dh][^>]*>(.*?)</t[dh]>", m[1])
        |> collections.map(fn(cell) => cell[1] |> strip_tags() |> trim())
    }
)

# --- Text Processing Pipeline ---

fn strip_tags(html) => regex.replace_all(r"<[^>]+>", "", html)
fn trim(s) => s |> regex.replace(r"^\s+|\s+$", "")
fn normalize_whitespace(s) => regex.replace_all(r"\s+", " ", s)

pub fn clean_text(html) => {
    html
    |> strip_tags()
    |> regex.replace_all(r"&amp;", "&")
    |> regex.replace_all(r"&lt;", "<")
    |> regex.replace_all(r"&gt;", ">")
    |> regex.replace_all(r"&quot;", "\"")
    |> regex.replace_all(r"&#39;", "'")
    |> normalize_whitespace()
    |> trim()
}

# --- Data Pipeline ---

pub fn pipeline(data, stages) => {
    stages |> collections.reduce(data, fn(d, stage) => stage(d))
}

pub fn filter_by(field, predicate) => fn(items) => {
    items |> collections.filter(fn(item) => predicate(collections.get(item, field)))
}

pub fn sort_by_field(field, direction) => fn(items) => {
    let comparator = match direction {
        "asc" => fn(a, b) => collections.get(a, field) < collections.get(b, field),
        "desc" => fn(a, b) => collections.get(a, field) > collections.get(b, field),
        _ => fn(a, b) => a < b
    }
    items |> collections.sort(comparator)
}

pub fn unique_by(field) => fn(items) => {
    let mut seen = {}
    items |> collections.filter(fn(item) => {
        let key = collections.get(item, field)
        match collections.has(seen, key) {
            true => false,
            false => {
                seen = collections.set(seen, key, true)
                true
            }
        }
    })
}

pub fn limit(n) => fn(items) => items |> collections.take(n)

# --- Result Formatting ---

pub fn to_json_output(data) => json.encode(data, indent: 2)

pub fn to_csv(data, fields) => {
    let header = fields |> collections.join(",")
    let rows = data |> collections.map(fn(row) => {
        fields
        |> collections.map(fn(f) => "\"${collections.get(row, f, "")}\"")
        |> collections.join(",")
    })
    [header] |> collections.concat(rows) |> collections.join("\n")
}

# --- Scraping Session ---

pub async fn scrape(config, urls, extractors, transforms) => {
    let start = datetime.now()
    print("Starting scrape of ${collections.length(urls)} URLs...")
    
    let pages = await fetch_all(urls, config)
    
    let successful = pages |> collections.filter(fn(p) => collections.has(p, "ok"))
    let failed = pages |> collections.filter(fn(p) => collections.has(p, "error"))
    
    print("Fetched: ${collections.length(successful)} ok, ${collections.length(failed)} failed")
    
    let extracted = successful |> collections.flat_map(fn(page) => {
        let data = extract(page.ok, extractors)
        collections.set(data, "_source_url", page.url)
        [data]
    })
    
    let transformed = pipeline(extracted, transforms)
    
    let elapsed = datetime.diff(datetime.now(), start)
    
    {
        results: transformed,
        stats: {
            total_urls: collections.length(urls),
            successful: collections.length(successful),
            failed: collections.length(failed),
            results_count: collections.length(transformed),
            elapsed_ms: elapsed
        }
    }
}

# --- Main Demo ---

async fn main() => {
    print("=== Arc Web Scraper Demo ===\n")
    
    let config = scraper_config("https://example.com", {
        max_concurrent: 3,
        timeout_ms: 5000
    })
    
    let urls = build_urls("https://example.com", "/page/{page}", 1..11)
    print("Built ${collections.length(urls)} URLs to scrape")
    
    let extractors = [
        title_extractor(),
        link_extractor(),
        image_extractor()
    ]
    
    let transforms = [
        filter_by("titles", fn(t) => collections.length(t) > 0),
        unique_by("_source_url"),
        sort_by_field("_source_url", "asc"),
        limit(50)
    ]
    
    let result = await scrape(config, urls, extractors, transforms)
    
    print("\n--- Results ---")
    print("Found ${result.stats.results_count} results")
    print("Time: ${result.stats.elapsed_ms}ms")
    print("\nJSON output:")
    print(to_json_output(result))
}

main()
