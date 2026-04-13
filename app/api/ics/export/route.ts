import { itemService } from "@/src/app-services/container";
import { generateIcs } from "../../_lib/ics";
import { handleRouteError } from "../../_lib/http";

export async function GET(): Promise<Response> {
  try {
    const items = await itemService.listItems({});

    const events = items.map((item) => ({
      uid: item.externalId && item.externalSource ? item.externalId : `dinox-${item.id}`,
      summary: item.title,
      description: item.description,
      dtstart: item.startAt,
      dtend: item.endAt,
      allDay: item.allDay,
      url: item.links && item.links.length > 0 ? item.links[0].url : null,
      status: (item.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED") as "CONFIRMED" | "CANCELLED",
    }));

    const icsText = generateIcs({ events });

    return new Response(icsText, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="dinox-export.ics"',
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
