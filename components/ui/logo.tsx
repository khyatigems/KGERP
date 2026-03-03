import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <svg
      version="1.1"
      id="Layer_1"
      xmlns="http://www.w3.org/2000/svg"
      x="0px"
      y="0px"
      viewBox="0 0 1000 1000"
      xmlSpace="preserve"
      className={cn("w-full h-full drop-shadow-2xl", className)}
    >
      <style type="text/css">
        {`
          .st0{fill:#181547;}
          .st1{fill:#D03837;}
          .st2{fill:#FFFFFF;}
        `}
      </style>
      <g>
        <g>
          <polygon className="st2" points="391.3,256.3 300.9,375.7 420.8,256.3" />
          <polygon className="st2" points="465.1,256.3 374.7,375.7 494.6,256.3" />
          <polygon className="st2" points="608.7,256.3 699.1,375.7 579.2,256.3" />
          <polygon className="st2" points="534.9,256.3 625.3,375.7 505.4,256.3" />
        </g>
        <polygon
          className="st2"
          points="641.4,256.3 793.5,375.7 872,375.7 658.2,207.8 342.1,207.8 176.5,337.9 176.5,207.8 176,207.8 128,245.4 128,738.2 176.3,792.2 176.5,792.2 176.5,430.2 500.1,792.2 745.1,518.2 788.5,469.7 723.4,469.7 453.9,469.7 497.3,518.2 680.1,518.2 500.1,719.4 320.2,518.2 276.8,469.7 198.6,382.2 358.8,256.3"
        />
      </g>
    </svg>
  );
}
