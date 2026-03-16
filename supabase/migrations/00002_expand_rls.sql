create policy "locations_select_own"
  on public.locations for select
  using (
    exists (
      select 1 from public.closets
      where closets.id = locations.closet_id
        and closets.user_id = auth.uid()
    )
  );

create policy "locations_insert_own"
  on public.locations for insert
  with check (
    exists (
      select 1 from public.closets
      where closets.id = locations.closet_id
        and closets.user_id = auth.uid()
    )
  );

create policy "tags_select_own"
  on public.tags for select
  using (
    exists (
      select 1 from public.closets
      where closets.id = tags.closet_id
        and closets.user_id = auth.uid()
    )
  );

create policy "tags_insert_own"
  on public.tags for insert
  with check (
    exists (
      select 1 from public.closets
      where closets.id = tags.closet_id
        and closets.user_id = auth.uid()
    )
  );

create policy "items_select_own"
  on public.clothing_items for select
  using (
    exists (
      select 1 from public.closets
      where closets.id = clothing_items.closet_id
        and closets.user_id = auth.uid()
    )
  );

create policy "items_insert_own"
  on public.clothing_items for insert
  with check (
    exists (
      select 1 from public.closets
      where closets.id = clothing_items.closet_id
        and closets.user_id = auth.uid()
    )
  );

create policy "items_update_own"
  on public.clothing_items for update
  using (
    exists (
      select 1 from public.closets
      where closets.id = clothing_items.closet_id
        and closets.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.closets
      where closets.id = clothing_items.closet_id
        and closets.user_id = auth.uid()
    )
  );

create policy "outfits_select_own"
  on public.outfits for select
  using (
    exists (
      select 1 from public.closets
      where closets.id = outfits.closet_id
        and closets.user_id = auth.uid()
    )
  );

create policy "outfits_insert_own"
  on public.outfits for insert
  with check (
    exists (
      select 1 from public.closets
      where closets.id = outfits.closet_id
        and closets.user_id = auth.uid()
    )
  );

create policy "wear_logs_select_own"
  on public.wear_logs for select
  using (
    exists (
      select 1 from public.closets
      where closets.id = wear_logs.closet_id
        and closets.user_id = auth.uid()
    )
  );

create policy "wear_logs_insert_own"
  on public.wear_logs for insert
  with check (
    exists (
      select 1 from public.closets
      where closets.id = wear_logs.closet_id
        and closets.user_id = auth.uid()
    )
  );

create policy "care_logs_select_own"
  on public.care_logs for select
  using (
    exists (
      select 1 from public.clothing_items
      join public.closets on closets.id = clothing_items.closet_id
      where clothing_items.id = care_logs.item_id
        and closets.user_id = auth.uid()
    )
  );

create policy "care_logs_insert_own"
  on public.care_logs for insert
  with check (
    exists (
      select 1 from public.clothing_items
      join public.closets on closets.id = clothing_items.closet_id
      where clothing_items.id = care_logs.item_id
        and closets.user_id = auth.uid()
    )
  );

create policy "saved_filters_select_own"
  on public.saved_filters for select
  using (
    exists (
      select 1 from public.closets
      where closets.id = saved_filters.closet_id
        and closets.user_id = auth.uid()
    )
  );

create policy "saved_filters_insert_own"
  on public.saved_filters for insert
  with check (
    exists (
      select 1 from public.closets
      where closets.id = saved_filters.closet_id
        and closets.user_id = auth.uid()
    )
  );
