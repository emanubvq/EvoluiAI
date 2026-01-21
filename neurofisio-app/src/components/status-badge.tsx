import { Badge } from "@/components/ui/badge";
import { PatientStatus } from "@/lib/types";

interface StatusBadgeProps {
    status: PatientStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
    let variant: "default" | "destructive" | "outline" | "secondary" | null = "default";
    let className = "";

    switch (status) {
        case "VMI":
            variant = "destructive";
            break;
        case "Desmame":
            // Shadcn default badge doesn't usually have a warning variant, 
            // but we requested yellow/orange. We can style it or use a custom class if needed.
            // For now, let's use secondary with a specific clean class override if needed, 
            // or just assume standard shadcn secondary. 
            // Actually, standard usually has 'default', 'secondary', 'destructive', 'outline'.
            // I'll generic 'secondary' but add a yellow style via tailwind if strictly needed,
            // but 'secondary' is usually gray. The user asked for "warning (Yellow/Orange)".
            // I will use 'secondary' but add a specific class for yellow.
            variant = "secondary";
            className = "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200";
            break;
        case "VNI":
            // "success (Green)". I'll use outline with green style.
            variant = "outline"; // Using outline as base to avoid generic dark fill
            className = "bg-green-100 text-green-800 hover:bg-green-200 border-green-200 border";
            break;
        case "Alta":
            variant = "secondary"; // Blue/Gray - secondary fits well.
            className = "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200";
            break;
        case "Vago":
            variant = "outline";
            className = "text-muted-foreground border-dashed";
            break;
        default:
            variant = "default";
            break;
    }

    return (
        <Badge variant={variant} className={className}>
            {status}
        </Badge>
    );
}
