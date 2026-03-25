import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import TCCard from "../components/directory/TCCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const SPECIALTIES = [
  "All Specialties","Creative Finance","Subject-To","Seller Finance","DSCR",
  "Fix & Flip","Short Sale","REO","Wholesale","Multi-Family","Commercial",
];

const US_STATES = [
  "All States","Alabama","Alaska","Arizona","Arkansas","California","Colorado",
  "Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois",
  "Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland",
  "Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana",
  "Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York",
  "North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania",
  "Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah",
  "Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

const RATINGS = [
  { label: "All Ratings", value: "0" },
  { label: "4.5+ Stars", value: "4.5" },
  { label: "4.0+ Stars", value: "4.0" },
  { label: "3.5+ Stars", value: "3.5" },
];

const AVAILABILITY = [
  { label: "Any Availability", value: "all" },
  { label: "Available", value: "available" },
  { label: "Limited", value: "limited" },
];

export default function TCDirectory() {
  const [profiles, setProfiles] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("All Specialties");
  const [state, setState] = useState("All States");
  const [minRating, setMinRating] = useState("0");
  const [availability, setAvailability] = useState("all");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const tcProfiles = await base44.entities.TCProfile.filter({ is_published: true });
    setProfiles(tcProfiles);

    if (tcProfiles.length > 0) {
      const users = await base44.entities.User.list();
      const map = {};
      users.forEach((u) => { map[u.id] = u; });
      setUserMap(map);
    }
    setLoading(false);
  };

  const filtered = profiles.filter((p) => {
    const user = userMap[p.user_id];
    const name = user?.full_name?.toLowerCase() || "";
    const company = user?.company_name?.toLowerCase() || "";

    const matchesSearch = !search ||
      name.includes(search.toLowerCase()) ||
      company.includes(search.toLowerCase()) ||
      p.title?.toLowerCase().includes(search.toLowerCase());

    const matchesSpecialty = specialty === "All Specialties" ||
      p.specialties?.includes(specialty);

    const matchesState = state === "All States" || p.state === state;

    const matchesRating = !minRating || minRating === "0" ||
      (p.average_rating || 0) >= parseFloat(minRating);

    const matchesAvailability = availability === "all" || p.availability === availability;

    return matchesSearch && matchesSpecialty && matchesState && matchesRating && matchesAvailability;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-navy">TC Directory</h1>
        <p className="text-muted-foreground mt-1">Browse and connect with verified Transaction Coordinators</p>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, company, or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger className="bg-background text-sm">
                <SelectValue placeholder="Specialty" />
              </SelectTrigger>
              <SelectContent>
                {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className="bg-background text-sm">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={minRating} onValueChange={setMinRating}>
              <SelectTrigger className="bg-background text-sm">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                {RATINGS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={availability} onValueChange={setAvailability}>
              <SelectTrigger className="bg-background text-sm">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABILITY.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading..." : `${filtered.length} Transaction Coordinator${filtered.length !== 1 ? "s" : ""} found`}
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-5 animate-pulse">
              <div className="flex gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border py-20 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-bold text-navy">No TCs found</p>
          <p className="text-muted-foreground text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((profile) => (
            <TCCard key={profile.id} profile={profile} user={userMap[profile.user_id]} />
          ))}
        </div>
      )}
    </div>
  );
}