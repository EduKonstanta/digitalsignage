import { describe, expect, it } from "vitest";
import { mergeAcademicStores, type AcademicStoreData } from "@/lib/academic-store";

function emptyStore(): AcademicStoreData {
  return {
    createdBranches: [],
    updatedBranches: {},
    deletedBranchIds: [],
    createdRooms: [],
    updatedRooms: {},
    deletedRoomIds: [],
    createdTutors: [],
    updatedTutors: {},
    deletedTutorIds: [],
    createdPrograms: [],
    updatedPrograms: {},
    deletedProgramIds: [],
    createdClasses: [],
    updatedClasses: {},
    deletedClassIds: [],
    createdSubjects: [],
    updatedSubjects: {},
    deletedSubjectIds: [],
    createdSchedules: [],
    updatedSchedules: {},
    deletedScheduleIds: [],
  };
}

describe("mergeAcademicStores", () => {
  it("keeps both admins' edits on different records", () => {
    const baseline = emptyStore();

    const local = emptyStore();
    local.updatedRooms = { "room-a": { name: "Ruang A Baru" } };

    const fresh = emptyStore();
    fresh.updatedRooms = { "room-b": { name: "Ruang B Baru" } };

    const merged = mergeAcademicStores(baseline, local, fresh);

    expect(merged.updatedRooms).toEqual({
      "room-a": { name: "Ruang A Baru" },
      "room-b": { name: "Ruang B Baru" },
    });
  });

  it("does not resurrect a record the other admin left untouched", () => {
    const baseline = emptyStore();
    baseline.updatedRooms = { "room-a": { name: "Lama" } };

    // Admin ini hanya mengubah room-b, jadi room-a miliknya masih nilai lama.
    const local = emptyStore();
    local.updatedRooms = { "room-a": { name: "Lama" }, "room-b": { name: "B" } };

    // Admin lain sudah mengubah room-a lebih dulu.
    const fresh = emptyStore();
    fresh.updatedRooms = { "room-a": { name: "Diubah Admin Lain" } };

    const merged = mergeAcademicStores(baseline, local, fresh);

    expect(merged.updatedRooms["room-a"]).toEqual({ name: "Diubah Admin Lain" });
    expect(merged.updatedRooms["room-b"]).toEqual({ name: "B" });
  });

  it("unions created rows and deleted ids", () => {
    const baseline = emptyStore();

    const local = emptyStore();
    local.createdBranches = [
      { id: "b1", code: "B1", name: "Cabang 1", address: null, timezone: "Asia/Jakarta", isActive: true },
    ];
    local.deletedRoomIds = ["r1"];

    const fresh = emptyStore();
    fresh.createdBranches = [
      { id: "b2", code: "B2", name: "Cabang 2", address: null, timezone: "Asia/Jakarta", isActive: true },
    ];
    fresh.deletedRoomIds = ["r2"];

    const merged = mergeAcademicStores(baseline, local, fresh);

    expect(merged.createdBranches.map((row) => row.id).sort()).toEqual(["b1", "b2"]);
    expect(merged.deletedRoomIds.sort()).toEqual(["r1", "r2"]);
  });
});
