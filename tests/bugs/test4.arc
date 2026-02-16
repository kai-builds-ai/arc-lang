# Test: destructuring, mut, async
let { a, b } = { a: 1, b: 2 }
let [x, y] = [10, 20]
let mut counter = 0
counter = counter + 1

fn add(a, b) => a + b

async fn fetch_data(url) {
  let result = await @GET url
  result
}
