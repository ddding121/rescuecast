"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Accessibility, AlertTriangle, BellRing, Camera, Check, ChevronRight, Copy, Ear, Globe2, History, ImageIcon, Loader2, LocateFixed, MapPin, Megaphone, Pause, Plus, Radio, RefreshCw, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, Upload, Users, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const samples = {
  rain: "受持续强降雨影响，河东区多处低洼路段积水，滨河路与学府街交叉口已临时封闭。请附近居民避免进入地下空间，居住在一层的居民提前转移重要物品，并关注后续疏散通知。",
  fire: "科创园A座三层出现火情，现场已启动消防响应。楼内人员请立即沿安全通道向东广场撤离，禁止乘坐电梯，不要返回办公室取物。",
  power: "受设备故障影响，城南片区预计停电两小时。使用医疗设备的居民请立即联系社区服务中心，电梯暂停使用，请勿自行进入配电区域。",
};

type EventType = string;
type Severity = "关注" | "警戒" | "紧急";
type HistoryItem = { id: number; title: string; eventType: EventType; severity: Severity; location: string; source: string; time: string; status: "已发布" | "草稿" };
type ModelContextLike = { registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void> };
type UploadedImage = { id: string; name: string; url: string };

const RiskMap = dynamic(() => import("@/components/risk-map"), { ssr: false, loading: () => <div className="grid h-full place-items-center bg-[#0b202c] text-sm text-slate-400">地图加载中…</div> });

const eventTypes = ["暴雨内涝", "火灾", "停电", "地震", "台风", "极端高温", "燃气泄漏", "危险品事故", "公共卫生事件", "道路中断", "自定义事件"];

const actionsByType: Record<string, string[]> = {
  暴雨内涝: ["远离地下空间和积水路段", "将药品、证件和电源移至高处", "保持手机畅通并等待疏散通知"],
  火灾: ["沿最近的安全通道撤离", "禁止乘坐电梯", "到达集合点后报告平安"],
  停电: ["关闭高功率电器并拔下插头", "使用医疗设备者联系社区服务中心", "不要进入电梯或配电区域"],
  地震: ["远离玻璃和高大家具", "震动停止后沿楼梯撤离", "前往开阔区域并关注余震"],
  台风: ["关紧门窗并收回室外物品", "远离海岸、广告牌和临时建筑", "储备饮水并持续关注预警"],
  极端高温: ["减少正午时段户外活动", "及时补水并照顾老人儿童", "出现中暑症状立即转移至阴凉处"],
  燃气泄漏: ["立即关闭燃气阀门", "不要开关电器或使用明火", "打开门窗并撤离到室外安全区域"],
  危险品事故: ["远离事故现场并处于上风方向", "关闭门窗和通风设备", "按官方指引撤离或就地避险"],
  公共卫生事件: ["做好个人防护并减少聚集", "留意官方健康指引", "出现相关症状及时联系医疗机构"],
  道路中断: ["避开封闭路段", "提前选择替代路线", "服从现场人员交通指挥"],
};

const easyReadByType: Record<string, string> = {
  暴雨内涝: "外面雨很大，有些道路已经积水。请留在安全的高处，不要去地下室，也不要走进积水。准备好手机、药品和证件，等待工作人员通知。",
  火灾: "楼里发生了火情。请现在离开房间，走楼梯到室外广场。不要坐电梯，也不要回去拿东西。",
  停电: "附近暂时停电。请不要乘坐电梯。需要用医疗设备的人，请马上联系社区工作人员。",
  地震: "发生地震时，请先保护头部，远离窗户。摇晃停止后走楼梯离开，到空旷的地方等待通知。",
  台风: "台风正在靠近。请留在结实的房屋里，关好门窗，不要去海边。准备好饮水、手机和照明工具。",
  极端高温: "天气非常热。请多喝水，尽量待在凉快的地方。老人和儿童不要长时间待在室外。",
};

export default function Home() {
  const [eventType, setEventType] = useState<EventType>("暴雨内涝");
  const [customEventType, setCustomEventType] = useState("");
  const [incidentTime, setIncidentTime] = useState("");
  const [severity, setSeverity] = useState<Severity>("警戒");
  const [location, setLocation] = useState("河东区 · 滨河路周边");
  const [source, setSource] = useState(samples.rain);
  const [audiences, setAudiences] = useState(["公众", "老年人", "听障人士"]);
  const [result, setResult] = useState({ eventType: "暴雨内涝" as EventType, severity: "警戒" as Severity, location: "河东区 · 滨河路周边", source: samples.rain });
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [reviewChecks, setReviewChecks] = useState([false, false, false]);
  const [publishState, setPublishState] = useState<"idle" | "published">("idle");
  const [history, setHistory] = useState<HistoryItem[]>([
    { id: 1, title: "城南片区停电提示", eventType: "停电", severity: "关注", location: "城南片区", source: samples.power, time: "今天 09:20", status: "已发布" },
    { id: 2, title: "科创园消防疏散", eventType: "火灾", severity: "紧急", location: "科创园 A 座", source: samples.fire, time: "昨天 16:48", status: "已发布" },
    { id: 3, title: "滨河路积水预警", eventType: "暴雨内涝", severity: "警戒", location: "滨河路周边", source: samples.rain, time: "昨天 08:15", status: "草稿" },
  ]);
  const [mapPoint, setMapPoint] = useState({ lat: 39.9042, lon: 116.4074, name: "北京市" });
  const [mapLoading, setMapLoading] = useState(false);
  const [mapMessage, setMapMessage] = useState("可拖动、缩放地图；输入地点后点击重新定位");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [feedback, setFeedback] = useState<{ helpful: number; unhelpful: number; myVote: string | null }>({ helpful: 0, unhelpful: 0, myVote: null });
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const effectiveEventType = eventType === "自定义事件" ? customEventType.trim() || "自定义事件" : eventType;
  const actions = actionsByType[result.eventType] || ["远离危险区域并保持冷静", "照顾身边需要帮助的人", "关注官方通知并服从现场指挥"];
  const headline = `${result.location}发布${result.eventType}${result.severity}提示`;
  const english = useMemo(() => {
    const type = ({ 暴雨内涝: "flooding", 火灾: "fire", 停电: "power outage", 地震: "earthquake", 台风: "typhoon", 极端高温: "extreme heat", 燃气泄漏: "gas leak", 危险品事故: "hazardous materials incident", 公共卫生事件: "public health emergency", 道路中断: "road closure" } as Record<string,string>)[result.eventType] || "emergency";
    return `A ${result.severity === "紧急" ? "critical" : "heightened"} ${type} alert is in effect for ${result.location}. Follow official instructions, avoid hazardous areas, assist people who need help, and keep your phone available for updates.`;
  }, [result]);


  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContextLike }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const allowedTypes: EventType[] = eventTypes.filter((item) => item !== "自定义事件");
    const allowedSeverities: Severity[] = ["关注", "警戒", "紧急"];
    const allowedAudiences = ["公众", "老年人", "儿童", "听障人士"];
    void Promise.resolve(context.registerTool({
      name: "generate_accessible_emergency_alert",
      title: "生成无障碍应急通告",
      description: "根据事件类型、风险等级、影响区域、原始通知和重点受众，配置工作台并生成多版本应急通告。",
      inputSchema: { type: "object", properties: { eventType: { type: "string", enum: allowedTypes }, severity: { type: "string", enum: allowedSeverities }, location: { type: "string", minLength: 1 }, source: { type: "string", minLength: 1 }, audiences: { type: "array", items: { type: "string", enum: allowedAudiences }, minItems: 1, uniqueItems: true } }, required: ["eventType", "severity", "location", "source", "audiences"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const value = input as { eventType?: EventType; severity?: Severity; location?: string; source?: string; audiences?: string[] };
        if (!allowedTypes.includes(value.eventType as EventType) || !allowedSeverities.includes(value.severity as Severity) || !value.location?.trim() || !value.source?.trim() || !Array.isArray(value.audiences) || !value.audiences.length || value.audiences.some((item) => !allowedAudiences.includes(item))) throw new Error("应急通告参数无效");
        const next = { eventType: value.eventType!, severity: value.severity!, location: value.location.trim(), source: value.source.trim() };
        setEventType(next.eventType); setSeverity(next.severity); setLocation(next.location); setSource(next.source); setAudiences(value.audiences); setResult(next); setPublishState("idle"); setReviewChecks([false, false, false]);
        return { status: "generated", headline: `${next.location}发布${next.eventType}${next.severity}提示`, audienceCount: value.audiences.length };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  useEffect(() => {
    void fetch("/api/feedback").then(async (response) => {
      if (response.ok) setFeedback(await response.json());
    }).catch(() => undefined);
    void fetch("/api/scene-images").then(async (response) => {
      if (response.ok) setUploadedImages((await response.json()).images || []);
    }).catch(() => undefined);
  }, []);

  function toggleAudience(item: string, checked: boolean) {
    setAudiences((current) => checked ? [...new Set([...current, item])] : current.filter((value) => value !== item));
  }

  function generate() {
    setGenerating(true);
    window.setTimeout(() => {
      setResult({ eventType: effectiveEventType, severity, location: location.trim() || "未指定区域", source: source.trim() });
      setPublishState("idle");
      setReviewChecks([false, false, false]);
      setGenerating(false);
    }, 650);
  }

  async function locateOnMap() {
    if (!location.trim()) { setMapMessage("请先输入影响区域"); return; }
    setMapLoading(true); setMapMessage("正在查找地点…");
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(location)}`);
      const data = await response.json().catch(() => ({ error: "地图定位服务连接失败" }));
      if (!response.ok) throw new Error(data.error || "定位失败");
      setMapPoint({ lat: data.lat, lon: data.lon, name: data.name });
      setMapMessage(`已精确定位：${data.name}`);
    } catch (error) {
      try {
        const arcgis = new URLSearchParams({ SingleLine: location.trim(), f: "json", outFields: "Match_addr,Addr_type", countryCode: "CHN", maxLocations: "1" });
        const arcgisResponse = await fetch(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?${arcgis.toString()}`);
        if (arcgisResponse.ok) {
          const data = await arcgisResponse.json() as { candidates?: Array<{ address: string; score: number; location: { x: number; y: number } }> };
          const match = data.candidates?.find((candidate) => candidate.score >= 70);
          if (match) {
            setMapPoint({ lat: match.location.y, lon: match.location.x, name: match.address });
            setMapMessage(`已精确定位：${match.address}`);
            return;
          }
        }
        const params = new URLSearchParams({ format: "jsonv2", limit: "1", "accept-language": "zh-CN", countrycodes: "cn", q: location.trim() });
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
        if (response.ok) {
          const results = await response.json() as Array<{ lat: string; lon: string; display_name: string }>;
          if (results[0]) {
            setMapPoint({ lat: Number(results[0].lat), lon: Number(results[0].lon), name: results[0].display_name });
            setMapMessage(`已精确定位：${results[0].display_name}`);
            return;
          }
        }
      } catch { /* Continue to the safe city fallback below. */ }
      const fallbackLocations = [
        { keywords: ["天安门"], lat: 39.9055, lon: 116.3976, name: "北京市天安门广场" },
        { keywords: ["北京"], lat: 39.9042, lon: 116.4074, name: "北京市中心" },
        { keywords: ["上海"], lat: 31.2304, lon: 121.4737, name: "上海市中心" },
        { keywords: ["广州"], lat: 23.1291, lon: 113.2644, name: "广州市中心" },
        { keywords: ["深圳"], lat: 22.5431, lon: 114.0579, name: "深圳市中心" },
        { keywords: ["香港"], lat: 22.3193, lon: 114.1694, name: "香港" },
      ];
      const fallback = fallbackLocations.find((item) => item.keywords.some((keyword) => location.includes(keyword)));
      if (fallback) {
        setMapPoint({ lat: fallback.lat, lon: fallback.lon, name: fallback.name });
        setMapMessage(`定位服务繁忙，已显示${fallback.name}附近；地图仍可拖动和缩放`);
      } else {
        setMapMessage(error instanceof Error ? error.message : "定位失败");
      }
    }
    finally { setMapLoading(false); }
  }

  function chooseImages(files: FileList | null) {
    if (!files) return;
    const next = Array.from(files).filter((file) => file.type.startsWith("image/")).slice(0,4);
    setSelectedImages(next); setUploadMessage(next.length ? `已选择 ${next.length} 张，点击上传后保存到现场记录` : "");
  }

  async function uploadImages() {
    if (!selectedImages.length) return;
    setImageUploading(true); setUploadMessage("正在安全上传…");
    try {
      const uploaded: UploadedImage[] = [];
      for (const file of selectedImages) {
        const response = await fetch("/api/scene-images", { method: "POST", headers: { "content-type": file.type, "x-file-name": encodeURIComponent(file.name) }, body: file });
        const data = await response.json().catch(() => ({ error: "上传连接中断" }));
        if (!response.ok) throw new Error(data.error || "上传失败");
        uploaded.push(data.image);
      }
      setUploadedImages((items) => [...uploaded, ...items].slice(0,4)); setSelectedImages([]);
      setUploadMessage(`已保存 ${uploaded.length} 张现场图片`);
    } catch (error) { setUploadMessage(error instanceof Error ? error.message : "上传失败，请稍后重试"); }
    finally { setImageUploading(false); }
  }

  async function vote(value: "helpful" | "unhelpful") {
    if (feedback.myVote || feedbackLoading) return;
    setFeedbackLoading(true); setFeedbackMessage("");
    try {
      const response = await fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ value }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "评价失败");
      setFeedback(data); setFeedbackMessage(value === "helpful" ? "谢谢认可，这会帮助我们继续改进。" : "反馈已记录，我们会继续优化。" );
    } catch (error) { setFeedbackMessage(error instanceof Error ? error.message : "评价失败"); }
    finally { setFeedbackLoading(false); }
  }

  function loadRecord(item: HistoryItem) {
    setEventType(item.eventType); setSeverity(item.severity); setLocation(item.location); setSource(item.source);
    setResult({ eventType: item.eventType, severity: item.severity, location: item.location, source: item.source });
    setHistoryOpen(false); setPublishState(item.status === "已发布" ? "published" : "idle");
  }

  function newAlert() {
    setLocation(""); setSource(""); setSeverity("关注"); setIncidentTime(""); setSelectedImages([]); setAudiences(["公众"]); setPublishState("idle");
  }

  function toggleSpeech() {
    if (!("speechSynthesis" in window)) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const text = `${headline}。${result.source}。行动指引：${actions.join("。")}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN"; utterance.rate = 0.82;
    utterance.onend = () => setSpeaking(false); utterance.onerror = () => setSpeaking(false);
    setSpeaking(true); window.speechSynthesis.speak(utterance);
  }

  function publishAlert() {
    if (!reviewChecks.every(Boolean)) return;
    const item: HistoryItem = { id: Date.now(), title: headline, eventType: result.eventType, severity: result.severity, location: result.location, source: result.source, time: "刚刚", status: "已发布" };
    setHistory((items) => [item, ...items.filter((entry) => entry.title !== item.title)]);
    setPublishState("published"); setReviewOpen(false);
  }

  const accessibilityClass = `${largeText ? "text-[18px]" : ""} ${highContrast ? "contrast-[1.18]" : ""} ${reduceMotion ? "motion-reduce:*:transition-none" : ""}`;

  async function copyAlert() {
    await navigator.clipboard.writeText(`${headline}\n${result.source}\n${actions.map((item, index) => `${index + 1}. ${item}`).join("\n")}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className={`min-h-screen bg-[#07141d] text-[#10222f] ${accessibilityClass}`}>
      <header className="border-b border-white/10 bg-[#07141d] text-white">
        <div className="mx-auto flex h-[72px] max-w-[1580px] items-center justify-between px-4 sm:px-7">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#ff5a36] shadow-[0_8px_24px_rgba(255,90,54,.28)]"><Radio className="size-5" /></span><div><p className="text-lg font-extrabold tracking-[-.03em]">RescueCast</p><p className="text-xs text-slate-400">智能无障碍应急沟通平台</p></div></div>
          <div className="flex items-center gap-2"><span className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-sm text-emerald-300 sm:flex"><span className="size-2 rounded-full bg-emerald-400" />系统在线</span><Button onClick={() => setAccessibilityOpen(true)} variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Accessibility />无障碍</Button></div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1580px] gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-72px)] border-r border-white/10 bg-[#0a1b27] p-5 text-white lg:block">
          <Button onClick={newAlert} className="h-11 w-full justify-start rounded-xl bg-[#ff5a36] font-bold hover:bg-[#ff6b49]"><Plus />新建应急通告</Button>
          <nav className="mt-7 space-y-1" aria-label="主要导航"><button className="flex w-full items-center gap-3 rounded-xl bg-white/10 px-3 py-3 text-left text-sm font-semibold"><Sparkles className="size-4 text-[#ff8a68]" />智能生成</button><button onClick={() => setHistoryOpen(true)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-400 hover:bg-white/5"><History className="size-4" />历史事件<span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs">{history.length}</span></button><button onClick={() => setTemplateOpen(true)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-400 hover:bg-white/5"><Users className="size-4" />受众模板</button></nav>
          <div className="mt-10 border-t border-white/10 pt-5"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">近期事件</p>{history.slice(0,3).map((item, index) => <button onClick={() => loadRecord(item)} key={item.id} className="mt-2 block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-white/5"><span className={`mr-2 inline-block size-2 rounded-full ${item.severity === "紧急" ? "bg-red-400" : item.severity === "警戒" ? "bg-amber-400" : "bg-cyan-400"}`} />{item.title}</button>)}</div>
          <div className="mt-10 rounded-2xl border border-cyan-300/15 bg-cyan-300/5 p-4"><div className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="size-4 text-cyan-300" />发布前人工核验</div><p className="mt-2 text-xs leading-5 text-slate-400">AI 生成内容仅用于辅助，正式发布前必须由应急负责人确认。</p></div>
        </aside>

        <section className="min-w-0 bg-[#eef2f3] p-4 sm:p-6 xl:p-8">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-[#eb4d2d]">应急内容工作台</p><h1 className="mt-1 text-2xl font-black tracking-[-.035em] text-[#10222f] sm:text-3xl">把一条通知，转化为人人都能理解的行动指引</h1></div><div className="flex items-center gap-2 text-sm text-slate-500"><BellRing className="size-4" />最近更新：刚刚</div></div>
          <div className="grid gap-5 xl:grid-cols-[minmax(340px,.82fr)_minmax(0,1.35fr)_300px]">
            <section className="rounded-2xl border border-[#d8e0e3] bg-white p-5 shadow-[0_10px_32px_rgba(21,42,54,.06)]">
              <div className="flex items-center justify-between"><h2 className="font-extrabold">01 · 输入事件信息</h2><button onClick={() => { setEventType("暴雨内涝"); setSeverity("警戒"); setLocation("河东区 · 滨河路周边"); setSource(samples.rain); }} className="text-sm font-semibold text-[#d94a2d]">载入示例</button></div>
              <div className="mt-5 space-y-4">
                <div><label className="mb-2 block text-sm font-bold text-slate-600">事件类型</label><Select value={eventType} onValueChange={(value) => setEventType(value)}><SelectTrigger className="h-11 w-full rounded-xl border-[#d6dfe2] bg-[#f8fafb]"><SelectValue /></SelectTrigger><SelectContent>{eventTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>{eventType === "自定义事件" && <input value={customEventType} onChange={(event) => setCustomEventType(event.target.value)} placeholder="输入事件名称，例如：大型活动踩踏风险" className="mt-2 h-11 w-full rounded-xl border border-[#d6dfe2] bg-[#f8fafb] px-3 text-sm outline-none focus:border-[#ff7658]" />}</div>
                <div><label className="mb-2 block text-sm font-bold text-slate-600">影响区域</label><div className="flex h-11 items-center gap-2 rounded-xl border border-[#d6dfe2] bg-[#f8fafb] px-3"><MapPin className="size-4 text-[#d94a2d]" /><input value={location} onChange={(event) => setLocation(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void locateOnMap(); }} placeholder="输入具体地点，如：北京市朝阳区朝阳大悦城" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></div><p className="mt-1.5 text-xs leading-5 text-slate-400">支持商场、学校、医院、道路和具体建筑；按回车或点击右侧地图按钮定位。</p></div>
                <div><label className="mb-2 block text-sm font-bold text-slate-600">发生时间（可选）</label><input type="datetime-local" value={incidentTime} onChange={(event) => setIncidentTime(event.target.value)} className="h-11 w-full rounded-xl border border-[#d6dfe2] bg-[#f8fafb] px-3 text-sm outline-none focus:border-[#ff7658]" /></div>
                <div><label className="mb-2 block text-sm font-bold text-slate-600">风险级别</label><div className="grid grid-cols-3 gap-2">{(["关注", "警戒", "紧急"] as Severity[]).map((item) => <button key={item} onClick={() => setSeverity(item)} className={`rounded-xl border px-2 py-2.5 text-sm font-bold transition ${severity === item ? item === "紧急" ? "border-red-500 bg-red-50 text-red-700" : "border-[#ff7658] bg-[#fff1ed] text-[#c43f25]" : "border-[#dce3e5] text-slate-500 hover:bg-slate-50"}`}>{item}</button>)}</div></div>
                <div><label className="mb-2 block text-sm font-bold text-slate-600">原始通知</label><Textarea value={source} onChange={(event) => setSource(event.target.value)} rows={7} className="resize-none rounded-xl border-[#d6dfe2] bg-[#f8fafb] text-base leading-7" /></div>
                <div><div className="mb-2 flex items-center justify-between"><p className="text-sm font-bold text-slate-600">现场图片</p><span className="text-xs text-slate-400">最多 4 张，每张 8MB</span></div><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#b9c8ce] bg-[#f8fafb] px-3 py-4 text-sm font-semibold text-slate-600 hover:border-[#ff7658] hover:bg-[#fff5f1]"><Camera className="size-5 text-[#d94a2d]" />选择现场图片<input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => chooseImages(event.target.files)} /></label>{selectedImages.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{selectedImages.map((file) => <span key={`${file.name}-${file.size}`} className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"><ImageIcon className="size-3" /><span className="max-w-32 truncate">{file.name}</span></span>)}</div>}<Button type="button" variant="outline" onClick={uploadImages} disabled={!selectedImages.length || imageUploading} className="mt-2 w-full">{imageUploading ? <Loader2 className="animate-spin" /> : <Upload />}{imageUploading ? "上传中" : "上传并保存"}</Button>{uploadMessage && <p className="mt-2 text-xs leading-5 text-slate-500">{uploadMessage}</p>}</div>
                <div><p className="mb-2 text-sm font-bold text-slate-600">重点受众</p><div className="grid grid-cols-2 gap-2">{["公众", "老年人", "儿童", "听障人士"].map((item) => <label key={item} className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e1e7e9] px-3 py-2 text-sm"><Checkbox checked={audiences.includes(item)} onCheckedChange={(checked) => toggleAudience(item, checked === true)} />{item}</label>)}</div></div>
                <Button onClick={generate} disabled={!source.trim() || generating || (eventType === "自定义事件" && !customEventType.trim())} className="h-12 w-full rounded-xl bg-[#ff5a36] text-base font-extrabold hover:bg-[#ef4c2a]">{generating ? <><RefreshCw className="animate-spin" />正在生成多版本通告</> : <><Sparkles />生成无障碍应急通告</>}</Button>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#d8e0e3] bg-white shadow-[0_10px_32px_rgba(21,42,54,.06)]">
              <div className="flex items-center justify-between border-b border-[#e4eaec] px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">AI OUTPUT</p><h2 className="mt-1 font-extrabold">02 · 多版本通告</h2></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={copyAlert}>{copied ? <Check /> : <Copy />}{copied ? "已复制" : "复制"}</Button><Button onClick={() => setReviewOpen(true)} size="sm" className={publishState === "published" ? "bg-emerald-700 hover:bg-emerald-800" : "bg-[#102b3a] hover:bg-[#173d50]"}>{publishState === "published" ? <Check /> : <Megaphone />}{publishState === "published" ? "已发布" : "准备发布"}</Button></div></div>
              <div className="p-5">
                <div className={`rounded-2xl border-l-[6px] p-5 ${result.severity === "紧急" ? "border-red-500 bg-red-50" : "border-[#ff673f] bg-[#fff5f1]"}`}><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#ff5a36] text-white"><AlertTriangle className="size-5" /></span><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#102b3a] px-2.5 py-1 text-xs font-extrabold text-white">{result.severity}</span><span className="text-sm font-semibold text-slate-500">{result.eventType}</span>{incidentTime && <span className="text-sm text-slate-500">{new Date(incidentTime).toLocaleString("zh-CN", { hour12: false })}</span>}</div><h3 className="mt-2 text-xl font-black tracking-[-.025em]">{headline}</h3><p className="mt-3 whitespace-pre-wrap text-base leading-7 text-slate-700">{result.source}</p></div></div></div>
                <Tabs defaultValue="action" className="mt-5"><TabsList className="grid h-11 w-full grid-cols-3 rounded-xl bg-[#edf2f4] p-1"><TabsTrigger value="action" className="rounded-lg">行动清单</TabsTrigger><TabsTrigger value="easy" className="rounded-lg">易读版本</TabsTrigger><TabsTrigger value="english" className="rounded-lg">English</TabsTrigger></TabsList><TabsContent value="action" className="mt-4 space-y-3">{actions.map((item, index) => <div key={item} className="flex items-center gap-3 rounded-xl border border-[#e2e8ea] bg-[#fafcfc] p-4"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#102b3a] text-sm font-black text-white">{index + 1}</span><p className="font-semibold text-slate-700">{item}</p><ChevronRight className="ml-auto size-4 text-slate-400" /></div>)}</TabsContent><TabsContent value="easy" className="mt-4"><div className="rounded-xl bg-[#e9f7f5] p-5"><div className="flex items-center gap-2 font-extrabold text-[#176a62]"><Ear className="size-5" />易读信息</div><p className="mt-3 text-lg leading-8 text-[#244f4c]">{easyReadByType[result.eventType] || "这里发生了紧急情况。请远离危险区域，保持手机畅通，照顾身边需要帮助的人，并等待工作人员通知。"}</p></div></TabsContent><TabsContent value="english" className="mt-4"><div className="rounded-xl bg-[#eef3fb] p-5"><div className="flex items-center gap-2 font-extrabold text-[#27568b]"><Globe2 className="size-5" />English alert</div><p className="mt-3 text-base leading-7 text-[#3d5877]">{english}</p></div></TabsContent></Tabs>
                <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-[#0c2533] p-4 text-white sm:flex-row sm:items-center"><span className={`grid size-11 shrink-0 place-items-center rounded-xl bg-cyan-300/15 text-cyan-300 ${speaking ? "animate-pulse" : ""}`}><Volume2 /></span><div className="min-w-0 flex-1"><p className="font-bold">{speaking ? "正在播报" : "语音播报已准备"}</p><p className="mt-0.5 text-sm text-slate-400">普通话 · 清晰慢速 · 可随时停止</p></div><Button onClick={toggleSpeech} variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">{speaking ? <Pause /> : <Volume2 />}{speaking ? "停止播报" : "试听播报"}</Button></div>
                {uploadedImages.length > 0 && <div className="mt-5"><div className="mb-3 flex items-center gap-2 font-extrabold"><Camera className="size-5 text-[#d94a2d]" />现场图片</div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{uploadedImages.map((image) => <figure key={image.id} className="overflow-hidden rounded-xl border bg-slate-50"><img src={image.url} alt={image.name} className="aspect-square w-full object-cover" /><figcaption className="truncate px-2 py-1.5 text-xs text-slate-500">{image.name}</figcaption></figure>)}</div></div>}
                <div className="mt-5 rounded-2xl border border-[#dce5e8] bg-[#f8fafb] p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="font-extrabold">这份通告对你有帮助吗？</p><p className="mt-1 text-sm text-slate-500">每位用户只能评价一次</p></div><div className="flex gap-2"><Button variant={feedback.myVote === "helpful" ? "default" : "outline"} disabled={!!feedback.myVote || feedbackLoading} onClick={() => vote("helpful")}><ThumbsUp />有帮助 {feedback.helpful}</Button><Button variant={feedback.myVote === "unhelpful" ? "default" : "outline"} disabled={!!feedback.myVote || feedbackLoading} onClick={() => vote("unhelpful")}><ThumbsDown />需改进 {feedback.unhelpful}</Button></div></div>{feedbackMessage && <p className="mt-3 text-sm font-semibold text-[#176a62]">{feedbackMessage}</p>}</div>
              </div>
            </section>

            <aside className="space-y-5">
              <section className="overflow-hidden rounded-2xl border border-[#d8e0e3] bg-[#102b3a] text-white shadow-[0_10px_32px_rgba(21,42,54,.08)]"><div className="flex items-center justify-between border-b border-white/10 px-4 py-4"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-cyan-300">LIVE MAP</p><h2 className="mt-1 font-extrabold">风险区域</h2></div><MapPin className="text-[#ff7658]" /></div><div className="relative h-72 overflow-hidden bg-[#0b202c]"><RiskMap lat={mapPoint.lat} lon={mapPoint.lon} name={mapPoint.name} /></div><div className="space-y-3 border-t border-white/10 p-4"><Button onClick={locateOnMap} disabled={mapLoading || !location.trim()} className="w-full bg-[#ff5a36] hover:bg-[#ef4c2a]">{mapLoading ? <Loader2 className="animate-spin" /> : <LocateFixed />}{mapLoading ? "定位中" : "按影响区域重新定位"}</Button><p className="text-xs leading-5 text-slate-400">{mapMessage}</p><a href={`https://www.openstreetmap.org/?mlat=${mapPoint.lat}&mlon=${mapPoint.lon}#map=15/${mapPoint.lat}/${mapPoint.lon}`} target="_blank" rel="noreferrer" className="block text-center text-xs font-semibold text-cyan-300 hover:text-cyan-200">在 OpenStreetMap 中打开</a></div></section>
              <section className="rounded-2xl border border-[#d8e0e3] bg-white p-5"><div className="flex items-center gap-2 font-extrabold"><Users className="size-5 text-[#e65335]" />受众适配</div><div className="mt-4 space-y-3">{audiences.length ? audiences.map((label) => ({label,value:{公众:"标准通告",老年人:"大字慢速",儿童:"短句图示",听障人士:"视觉警报"}[label] || "标准通告",icon:label.slice(0,1)})).map((item) => <div key={item.label} className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-[#eef3f4] text-sm font-black text-[#163748]">{item.icon}</span><div><p className="text-sm font-bold">{item.label}</p><p className="text-xs text-slate-500">{item.value}</p></div><Check className="ml-auto size-4 text-emerald-600" /></div>) : <p className="text-sm text-slate-500">尚未选择重点受众</p>}</div></section>
              <section className={`rounded-2xl border p-4 ${publishState === "published" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><div className={`flex items-center gap-2 font-extrabold ${publishState === "published" ? "text-emerald-900" : "text-amber-900"}`}>{publishState === "published" ? <Check className="size-5" /> : <AlertTriangle className="size-5" />}{publishState === "published" ? "核验通过" : "发布核验"}</div><p className="mt-2 text-sm leading-6 text-slate-700">{publishState === "published" ? "该通告已完成人工确认并进入发布记录。" : "地点、风险级别与行动指引需要由负责人确认。"}</p><Button onClick={() => setReviewOpen(true)} variant="outline" className="mt-3 w-full border-amber-300 bg-white text-amber-900 hover:bg-amber-100"><ShieldCheck />{publishState === "published" ? "查看核验" : "开始核验"}</Button></section>
            </aside>
          </div>
        </section>
      </div>

      <Dialog open={accessibilityOpen} onOpenChange={setAccessibilityOpen}><DialogContent><DialogHeader><DialogTitle>无障碍显示设置</DialogTitle><DialogDescription>调整当前工作台的阅读体验，设置仅在本次访问中生效。</DialogDescription></DialogHeader><div className="space-y-4 py-2">{[["放大页面文字","提高正文与按钮字号",largeText,setLargeText],["增强视觉对比","加强文字与背景差异",highContrast,setHighContrast],["减少动态效果","关闭加载与状态动画",reduceMotion,setReduceMotion]].map(([title,desc,value,setter]) => <div key={String(title)} className="flex items-center justify-between rounded-xl border p-4"><div><Label className="font-bold">{String(title)}</Label><p className="mt-1 text-sm text-slate-500">{String(desc)}</p></div><Switch checked={Boolean(value)} onCheckedChange={setter as (checked:boolean)=>void} /></div>)}</div><DialogFooter><Button onClick={() => setAccessibilityOpen(false)}>完成</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}><DialogContent><DialogHeader><DialogTitle>发布前人工核验</DialogTitle><DialogDescription>请逐项确认关键信息。全部完成后，通告会写入发布记录。</DialogDescription></DialogHeader><div className="space-y-3 py-2">{["地点与影响区域准确","风险级别与事件类型正确","行动指引清晰且可执行"].map((label,index) => <label key={label} className="flex cursor-pointer items-center gap-3 rounded-xl border p-4"><Checkbox checked={reviewChecks[index]} onCheckedChange={(checked) => setReviewChecks((items) => items.map((item,i) => i===index ? checked===true : item))}/><span className="font-semibold">{label}</span></label>)}</div><DialogFooter><Button variant="outline" onClick={() => setReviewOpen(false)}>稍后处理</Button><Button disabled={!reviewChecks.every(Boolean)} onClick={publishAlert} className="bg-[#ff5a36] hover:bg-[#ef4c2a]"><Megaphone />确认并发布</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>历史事件</DialogTitle><DialogDescription>查看已发布通告与草稿，点击任意记录可载入工作台。</DialogDescription></DialogHeader><div className="max-h-[55vh] space-y-2 overflow-y-auto py-2">{history.map((item) => <button key={item.id} onClick={() => loadRecord(item)} className="flex w-full items-center gap-4 rounded-xl border p-4 text-left hover:bg-slate-50"><span className={`size-3 rounded-full ${item.severity === "紧急" ? "bg-red-500" : item.severity === "警戒" ? "bg-amber-500" : "bg-cyan-500"}`} /><div className="min-w-0 flex-1"><p className="truncate font-bold">{item.title}</p><p className="mt-1 text-sm text-slate-500">{item.time} · {item.eventType} · {item.severity}</p></div><span className="text-xs font-semibold text-slate-500">{item.status}</span><ChevronRight className="size-4 text-slate-400" /></button>)}</div></DialogContent></Dialog>

      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}><DialogContent><DialogHeader><DialogTitle>受众适配模板</DialogTitle><DialogDescription>选择一套常用受众组合，系统会自动调整内容表达与发布形式。</DialogDescription></DialogHeader><div className="space-y-3 py-2">{[{name:"社区通用",items:["公众","老年人"]},{name:"校园与家庭",items:["公众","儿童"]},{name:"全场景无障碍",items:["公众","老年人","儿童","听障人士"]}].map((template) => <button key={template.name} onClick={() => {setAudiences(template.items);setTemplateOpen(false)}} className="w-full rounded-xl border p-4 text-left hover:border-[#ff7658] hover:bg-[#fff5f1]"><p className="font-bold">{template.name}</p><p className="mt-1 text-sm text-slate-500">{template.items.join(" · ")}</p></button>)}</div></DialogContent></Dialog>
    </main>
  );
}
