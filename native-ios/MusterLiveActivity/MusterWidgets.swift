// Widget extension: the lock screen / Dynamic Island Live Activity and a small Home Screen headcount widget.
import WidgetKit
import SwiftUI
import ActivityKit

struct MusterLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: MusterAttributes.self) { ctx in
            VStack(alignment: .leading, spacing: 8) {
                Text(ctx.attributes.kind == "real" ? "MUSTER IN PROGRESS" : "DRILL IN PROGRESS").font(.caption.bold()).foregroundStyle(.red)
                Text("\(ctx.state.accounted) of \(ctx.state.total) accounted for").font(.title3.bold())
                ProgressView(value: Double(ctx.state.accounted), total: Double(max(1, ctx.state.total)))
                Text(ctx.attributes.unit).font(.footnote).foregroundStyle(.secondary)
            }.padding()
        } dynamicIsland: { ctx in
            DynamicIsland {
                DynamicIslandExpandedRegion(.center) { Text("\(ctx.state.accounted) of \(ctx.state.total) in").font(.headline) }
                DynamicIslandExpandedRegion(.bottom) { ProgressView(value: Double(ctx.state.accounted), total: Double(max(1, ctx.state.total))) }
            } compactLeading: { Text("\(ctx.state.accounted)") } compactTrailing: { Text("/\(ctx.state.total)") } minimal: { Text("\(ctx.state.accounted)") }
        }
    }
}

struct HeadcountEntry: TimelineEntry { let date: Date; let n: Int; let t: Int; let unit: String }
struct HeadcountProvider: TimelineProvider {
    func placeholder(in: Context) -> HeadcountEntry { .init(date: .now, n: 11, t: 14, unit: "Team") }
    func getSnapshot(in: Context, completion: @escaping (HeadcountEntry) -> Void) { completion(read()) }
    func getTimeline(in: Context, completion: @escaping (Timeline<HeadcountEntry>) -> Void) { completion(Timeline(entries: [read()], policy: .after(.now.addingTimeInterval(900)))) }
    private func read() -> HeadcountEntry {
        let d = UserDefaults(suiteName: "group.com.antoniotyler.accountedfor")
        return .init(date: .now, n: d?.integer(forKey: "accounted") ?? 0, t: d?.integer(forKey: "total") ?? 0, unit: d?.string(forKey: "unit") ?? "Accounted For")
    }
}
struct HeadcountWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "Headcount", provider: HeadcountProvider()) { e in
            VStack(alignment: .leading) { Text(e.unit).font(.caption).foregroundStyle(.secondary); Spacer()
                Text(e.t > 0 ? "\(e.n)/\(e.t)" : "No check-in").font(.system(size: 34, weight: .heavy)); Text(e.t > 0 ? "Accounted for" : "Open the app to start").font(.caption) }
                .containerBackground(.background, for: .widget)
        }.configurationDisplayName("Headcount").description("Who is accounted for in the open check-in.").supportedFamilies([.systemSmall])
    }
}

@main struct MusterBundle: WidgetBundle { var body: some Widget { MusterLiveActivity(); HeadcountWidget() } }
