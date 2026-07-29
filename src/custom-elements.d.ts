import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "wistia-player": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          "media-id"?: string;
          aspect?: string;
          "play-bar"?: string;
          "fullscreen-button"?: string;
          "playback-rate-control"?: string;
          "quality-control"?: string;
          "volume-control"?: string;
          "settings-control"?: string;
        },
        HTMLElement
      >;
    }
  }
}
