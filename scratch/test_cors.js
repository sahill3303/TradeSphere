const url = "https://tradesphere-backend-nu.vercel.app/api/test";

fetch(url, {
  method: "GET",
  headers: {
    "Origin": "https://trade-sphere-gold.vercel.app"
  }
})
.then(async (res) => {
  console.log("Status:", res.status);
  console.log("Headers:", Object.fromEntries(res.headers));
  console.log("Body:", await res.text());
})
.catch(err => console.error(err));
