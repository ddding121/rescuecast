export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query) return Response.json({ error: "请输入地点" }, { status: 400 });

  const searches = [query, query.replace(/[·•]/g, " ").replace(/\s+/g, " ")];
  try {
    const arcgisParams = new URLSearchParams({ SingleLine: query, f: "json", outFields: "Match_addr,Addr_type", countryCode: "CHN", maxLocations: "5" });
    const arcgisResponse = await fetch(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?${arcgisParams.toString()}`);
    if (arcgisResponse.ok) {
      const arcgis = await arcgisResponse.json() as { candidates?: Array<{ address: string; score: number; location: { x: number; y: number } }> };
      const match = arcgis.candidates?.find((candidate) => candidate.score >= 70);
      if (match) return Response.json({ lat: match.location.y, lon: match.location.x, name: match.address, accuracy: "exact", score: match.score });
    }

    for (const text of [...new Set(searches)]) {
      const params = new URLSearchParams({ format: "jsonv2", limit: "5", "accept-language": "zh-CN", countrycodes: "cn", addressdetails: "1", q: text });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: { "User-Agent": "RescueCast emergency accessibility workspace" },
      });
      if (!response.ok) continue;
      const results = await response.json() as Array<{ lat: string; lon: string; display_name: string }>;
      const match = results[0];
      if (match) return Response.json({ lat: Number(match.lat), lon: Number(match.lon), name: match.display_name, accuracy: "exact" });
    }
    return Response.json({ error: "没有找到该地点，请补充城市、区县和建筑名称" }, { status: 404 });
  } catch {
    return Response.json({ error: "地图定位服务连接失败，请稍后重试" }, { status: 502 });
  }
}
