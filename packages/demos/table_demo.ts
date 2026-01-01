import { table, tbody, td, text, tfoot, th, thead, tr } from "@glade/glade";
import type { GladeTableRow } from "@glade/glade";
import type { Demo, DemoItem } from "./demo";
import { colors } from "@glade/utils";

export const TABLE_DEMO: Demo = {
  name: "Table",
  renderElement: (_cx, _state): DemoItem[] => {
    type Row = {
      name: string;
      role: string;
      status: string;
      email: string;
      lastActive: string;
    };

    const headers = ["Name", "Role", "Status", "Email", "Last Active"];
    const rows: Row[] = [
      {
        name: "Ada Lovelace",
        role: "Graphics Engineer",
        status: "Active",
        email: "ada@glade.dev",
        lastActive: "2m ago",
      },
      {
        name: "Grace Hopper",
        role: "Runtime Engineer",
        status: "Idle",
        email: "grace@glade.dev",
        lastActive: "12m ago",
      },
      {
        name: "Alan Turing",
        role: "Security Engineer",
        status: "Offline",
        email: "alan@glade.dev",
        lastActive: "1h ago",
      },
      {
        name: "Margaret Hamilton",
        role: "Engineering Manager",
        status: "Active",
        email: "margaret@glade.dev",
        lastActive: "5m ago",
      },
      {
        name: "Linus Torvalds",
        role: "Systems Engineer",
        status: "Idle",
        email: "linus@glade.dev",
        lastActive: "28m ago",
      },
    ];

    const bodyRows: GladeTableRow[] = [];

    rows.forEach((row, index) => {
      const rowBg = index % 2 === 0 ? colors.black.x700 : colors.black.x800;
      bodyRows.push(
        tr().children(
          td().bg(rowBg).border(1).px(10).py(6).child(text(row.name).size(13).weight(600)),
          td().bg(rowBg).border(1).px(10).py(6).child(text(row.role).size(13)),
          td().bg(rowBg).border(1).px(10).py(6).child(text(row.status).size(12)),
          td().bg(rowBg).border(1).px(10).py(6).child(text(row.email).size(12)),
          td().bg(rowBg).border(1).px(10).py(6).child(text(row.lastActive).size(12))
        )
      );
    });

    return [
      text("HTML-like table built on Glade grid layout with table/thead/tr/th/td helpers.").size(
        16
      ),
      table()
        .columnTemplate([180, 140, 120, "1fr", 120])
        .rowGap(0)
        .columnGap(0)
        .style({
          width: "100%",
          borderRadius: 10,
          borderWidth: 1,
          overflow: "hidden",
        })
        .child(
          thead().child(
            tr().children(
              ...headers.map((title) =>
                th().border(1).px(10).py(6).child(text(title).size(12).weight(700))
              )
            )
          )
        )
        .child(tbody().children(...bodyRows))
        .child(
          tfoot().child(
            tr().child(
              td()
                .colSpan(headers.length)
                .border(1)
                .px(10)
                .py(6)
                .child(text(`Showing ${rows.length} team members`).size(12))
            )
          )
        ),
    ];
  },
};
