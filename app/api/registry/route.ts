import { NextResponse } from "next/server";
import type { SavedComponent } from "@/types/component";
import {
  saveServerComponent,
  getServerComponents,
  deleteServerComponent,
} from "@/lib/server-storage";

export async function POST(request: Request) {
  try {
    const component = (await request.json()) as SavedComponent;

    if (!component.id || !component.name) {
      return NextResponse.json(
        { error: "Component must have id and name" },
        { status: 400 }
      );
    }

    await saveServerComponent(component);

    return NextResponse.json({ success: true, id: component.id });
  } catch (error) {
    console.error("Registry sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync component" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const components = await getServerComponents();
    return NextResponse.json(components);
  } catch (error) {
    console.error("Failed to get components:", error);
    return NextResponse.json(
      { error: "Failed to get components" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    await deleteServerComponent(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete component:", error);
    return NextResponse.json(
      { error: "Failed to delete component" },
      { status: 500 }
    );
  }
}
