interface WistiaPlayerProps {
  mediaId: string;
  aspect: number;
  className?: string;
  chromeless?: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "wistia-player": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & { "media-id": string; aspect?: string };
    }
  }
}

export function WistiaPlayer({
  mediaId,
  aspect,
  className = "",
  chromeless = false,
}: WistiaPlayerProps) {
  const paddingTop = `${(1 / aspect) * 100}%`;

  return (
    <div className={className} style={{ position: "relative" }}>
      <style>{`
        wistia-player[media-id='${mediaId}']:not(:defined) {
          background: center / contain no-repeat
            url('https://fast.wistia.com/embed/medias/${mediaId}/swatch');
          display: block;
          filter: blur(5px);
          padding-top: ${paddingTop};
        }
        ${
          chromeless
            ? `
        wistia-player[media-id='${mediaId}'] .w-bpb-wrapper,
        wistia-player[media-id='${mediaId}'] .wistia_playbar,
        wistia-player[media-id='${mediaId}'] [class*="playbar"],
        wistia-player[media-id='${mediaId}'] [class*="bottom-bar"],
        wistia-player[media-id='${mediaId}'] [class*="control-bar"] {
          display: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }`
            : ""
        }
      `}</style>
      <wistia-player media-id={mediaId} aspect={String(aspect)} />
    </div>
  );
}
