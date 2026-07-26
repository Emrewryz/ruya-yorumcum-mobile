// supabase/functions/follow-up/index.ts
// Supabase Dashboard → Edge Functions → "follow-up" adıyla oluştur
// (analyze-dream fonksiyonuyla aynı desen: service-role client + OpenRouter)
//
// Mobil uygulamadaki "sohbette ikinci mesaj" — önceden sadece kullanıcı
// mesajını DB'ye yazıp hiç AI çağrısı yapmıyordu. Bu fonksiyon o eksiği
// kapatıyor: kredi kontrolü + düşümü, AI cevabı, iki mesajın da kaydı.

import { serve }        from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FOLLOWUP_MODEL = "google/gemini-2.0-flash-lite-001";
const FOLLOWUP_COST  = 1;

const SYSTEM_PROMPT = `Sen "Rüya Yorumcum" platformunun uzman rüya tahlil asistanısın.
Kullanıcı sana daha önce bir rüya anlattı ve sen ona kapsamlı bir tahlil yaptın.
Şimdi kullanıcı bu tahlil hakkında ek bir soru soruyor. Sohbet bağlamını dikkate
alarak kısa, net ve derinlikli bir yanıt ver.

KURALLAR:
- Türkçe yaz, düz metin — JSON formatı KULLANMA.
- Önce İslami/geleneksel tabir geleneğine (İbn-i Sirin, Nablusi), sonra günlük
  dille psikolojik bağlantıya değin.
- YASAK: Arketip, Kolektif Bilinçdışı, Psikanaliz, Freud, Jung gibi akademik
  veya ezoterik terimler. Bunlar yerine "iç dünyanız, zihninizin yansıması"
  gibi sade ifadeler kullan.
- En fazla 3-4 kısa paragraf.`;

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function analysisToText(ai: any): string {
  if (!ai) return "Analiz mevcut değil.";
  const parts: string[] = [];
  if (ai.kisa_ozet)          parts.push(`Genel: ${ai.kisa_ozet}`);
  if (ai.detayli_tahlil)     parts.push(`Detaylı Tahlil: ${ai.detayli_tahlil}`);
  if (ai.islami_analiz)      parts.push(`İslami Yorum: ${ai.islami_analiz}`);
  if (ai.psikolojik_analiz)  parts.push(`Psikolojik Analiz: ${ai.psikolojik_analiz}`);
  if (ai.semboller)          parts.push(`Semboller: ${ai.semboller}`);
  return parts.join("\n\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { dreamId, message } = await req.json();
    const trimmed = (message ?? "").trim();

    if (!dreamId || trimmed.length < 3) {
      return json({ success: false, error: "Mesaj çok kısa.", code: "TOO_SHORT" }, 400);
    }

    const supabaseUrl   = Deno.env.get("SUPABASE_URL")!;
    const serviceKey    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Auth — misafirler follow-up yapamaz ──
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: userData } = token
      ? await supabase.auth.getUser(token)
      : { data: { user: null } };
    const user = userData?.user;

    if (!user) {
      return json({ success: false, error: "Giriş yapmanız gerekiyor.", code: "NO_AUTH" }, 401);
    }

    // ── Kredi kontrolü — API'ye gitmeden önce ──
    const { data: profile } = await supabase
      .from("profiles").select("credits").eq("id", user.id).single();

    if (!profile || (profile.credits ?? 0) < FOLLOWUP_COST) {
      return json({ success: false, error: "Yetersiz kredi. Devam etmek için kredi satın alın.", code: "NO_CREDIT" }, 403);
    }

    // ── Rüyayı ve sahipliği doğrula ──
    const { data: dream, error: dreamError } = await supabase
      .from("dreams")
      .select("dream_text, ai_response, user_id")
      .eq("id", dreamId)
      .single();

    if (dreamError || !dream || dream.user_id !== user.id) {
      return json({ success: false, error: "Rüya bulunamadı.", code: "NOT_FOUND" }, 404);
    }

    // ── Geçmiş mesajları çek (kronolojik) ──
    const { data: prevMessages } = await supabase
      .from("dream_chat_messages")
      .select("role, content")
      .eq("dream_id", dreamId)
      .order("created_at", { ascending: true });

    const contextMessages = [
      { role: "user",      content: `Rüya metni: "${dream.dream_text}"` },
      { role: "assistant", content: analysisToText(dream.ai_response) },
      ...(prevMessages ?? []).map((m: any) => ({ role: m.role, content: m.content ?? "" })),
      { role: "user",      content: trimmed },
    ];

    // ── Krediyi düş — API çağrısından hemen önce ──
    const { error: txError } = await supabase.rpc("handle_credit_transaction", {
      p_user_id:      user.id,
      p_amount:       -FOLLOWUP_COST,
      p_process_type: "spend",
      p_description:  "Follow-up Sorusu (mobil)",
      p_metadata:     { dream_id: dreamId },
    });

    if (txError) {
      return json({ success: false, error: "Kredi düşümü başarısız.", code: "NO_CREDIT" }, 403);
    }

    try {
      // ── AI çağrısı ──
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${openrouterKey}`,
          "HTTP-Referer":  "https://www.ruyayorumcum.com.tr",
          "X-Title":       "Ruya Yorumcum",
        },
        body: JSON.stringify({
          model:       FOLLOWUP_MODEL,
          temperature: 0.75,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...contextMessages,
          ],
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data   = await res.json();
      const aiText = data?.choices?.[0]?.message?.content?.trim();
      if (!aiText) throw new Error("AI'dan boş yanıt.");

      // ── İki mesajı DB'ye yaz ──
      const now = new Date().toISOString();
      const { data: inserted, error: insertError } = await supabase
        .from("dream_chat_messages")
        .insert([
          { dream_id: dreamId, user_id: user.id, role: "user",      content: trimmed, credits_spent: 0,             created_at: now },
          { dream_id: dreamId, user_id: user.id, role: "assistant", content: aiText,  credits_spent: FOLLOWUP_COST, created_at: new Date(Date.now() + 1).toISOString() },
        ])
        .select("id, role, content, created_at, credits_spent");

      if (insertError || !inserted || inserted.length < 2) {
        throw new Error("Mesajlar kaydedilemedi.");
      }

      await supabase.from("dreams").update({ last_message_at: new Date().toISOString() }).eq("id", dreamId);

      const userMessage      = inserted.find((m) => m.role === "user");
      const assistantMessage = inserted.find((m) => m.role === "assistant");

      return json({ success: true, userMessage, assistantMessage });

    } catch (err) {
      // ── Hata → kredi iadesi ──
      await supabase.rpc("handle_credit_transaction", {
        p_user_id:      user.id,
        p_amount:       FOLLOWUP_COST,
        p_process_type: "refund",
        p_description:  "İade: Follow-up Hatası (mobil)",
      });
      console.error("[follow-up] Hata:", err);
      return json({ success: false, error: "Bir hata oluştu. Lütfen tekrar deneyin.", code: "SERVER_ERROR" }, 500);
    }

  } catch (err) {
    console.error("[follow-up] Genel hata:", err);
    return json({ success: false, error: "Sunucu hatası.", code: "SERVER_ERROR" }, 500);
  }
});
