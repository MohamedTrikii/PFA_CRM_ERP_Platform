package com.erp.inventory.mapper;

import com.erp.inventory.domain.StockItem;
import com.erp.inventory.domain.StockLocation;
import com.erp.inventory.domain.StockMovement;
import com.erp.inventory.dto.StockDto;
import org.mapstruct.*;

@Mapper(componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface InventoryMapper {

    StockDto.LocationResponse toLocationResponse(StockLocation location);

    @BeanMapping(builder = @Builder(disableBuilder = true))
    StockLocation toLocation(StockDto.LocationCreate dto);

    @Mapping(target = "availableQuantity", expression = "java(item.availableQuantity())")
    StockDto.ItemResponse toItemResponse(StockItem item);

    StockDto.MovementResponse toMovementResponse(StockMovement movement);
}
