import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, Clock, PhoneCall } from "lucide-react"

export function RecentCallsList() {
  const recentCalls = [
    {
      id: 1,
      name: "Sarah Johnson",
      phone: "(555) 123-4567",
      date: "May 24, 2025",
      time: "10:30 AM",
      summary: "Interested in the 3-bedroom property on Oak Street. First-time homebuyer.",
    },
    {
      id: 2,
      name: "Michael Rodriguez",
      phone: "(555) 987-6543",
      date: "May 23, 2025",
      time: "2:15 PM",
      summary: "Looking to sell condo in downtown. Relocating for work.",
    },
    {
      id: 3,
      name: "Emily Chen",
      phone: "(555) 456-7890",
      date: "May 22, 2025",
      time: "4:45 PM",
      summary: "Wants information about listings in Westside neighborhood.",
    },
  ]

  return (
    <div className="space-y-4">
      {recentCalls.map((call) => (
        <div key={call.id} className="flex items-start space-x-4">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{call.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium leading-none">{call.name}</p>
              <div className="flex items-center text-xs text-muted-foreground">
                <PhoneCall className="mr-1 h-3 w-3" />
                {call.phone}
              </div>
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Calendar className="mr-1 h-3 w-3" />
              {call.date}
              <Clock className="ml-2 mr-1 h-3 w-3" />
              {call.time}
            </div>
            <p className="text-sm text-muted-foreground">{call.summary}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
