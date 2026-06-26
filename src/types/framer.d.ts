declare module "framer" {
    import { CSSProperties, ComponentType } from "react"

    export const addPropertyControls: (component: ComponentType<any>, controls: Record<string, any>) => void;
    
    export enum ControlType {
        String = "string",
        Color = "color",
        Number = "number",
        Boolean = "boolean",
        Enum = "enum",
        Object = "object",
        Padding = "padding",
        Font = "font"
    }

    export const RenderTarget: {
        current: () => "canvas" | "thumbnail" | "preview" | "export";
        canvas: "canvas";
        thumbnail: "thumbnail";
        preview: "preview";
        export: "export";
    };

    export const useIsStaticRenderer: () => boolean;
}
